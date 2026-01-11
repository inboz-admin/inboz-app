import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { BaseQueueService } from '../services/base-queue.service';
import { BullConfig } from '../config/bull.config';
import { QueueName } from '../enums/queue.enum';

/**
 * Queue Service for Campaign Processing
 * Manages job creation for campaign activation and email preparation
 */
@Injectable()
export class CampaignProcessorQueue
  extends BaseQueueService
  implements OnModuleInit
{
  protected readonly logger = new Logger(CampaignProcessorQueue.name);
  protected readonly queue: Queue;

  constructor(private readonly configService: ConfigService) {
    super();
    this.queue = BaseQueueService.createQueue(
      QueueName.CAMPAIGN_PROCESSOR,
      configService,
      {
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 10000, // 10 seconds
          },
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      },
    );
  }

  async onModuleInit() {
    this.logger.log('CampaignProcessorQueue initialized');
  }

  /**
   * Add a campaign processing job to the queue
   */
  async addCampaignJob(
    campaignId: string,
    organizationId: string,
    triggeredBy: 'user' | 'scheduler' = 'user',
    campaignName?: string,
  ) {
    const priority = BullConfig.getQueuePriority(QueueName.CAMPAIGN_PROCESSOR);

    const job = await this.queue.add(
      'process-campaign',
      {
        campaignId,
        organizationId,
        triggeredBy,
        queuedAt: new Date().toISOString(),
        name: campaignName || `Campaign ${campaignId}`, // Job name for identification
      },
      {
        jobId: `campaign-${campaignId}`,
        priority, // High priority for campaign processing
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );

    this.logger.log(`Queued campaign processing job: ${job.id} for campaign: ${campaignId}`);

    return {
      jobId: job.id,
      campaignId,
      message: 'Campaign queued for processing',
    };
  }

  /**
   * Add a job to process a single new step for an active campaign
   * This allows adding steps to running campaigns without reprocessing all steps
   * @param delayMs Optional delay in milliseconds - if provided, job will wait before processing
   * @param stepOrder Optional step order - used to set priority (lower order = higher priority)
   */
  async addNewStepJob(
    campaignId: string,
    stepId: string,
    organizationId: string,
    triggeredBy: 'user' | 'scheduler' = 'user',
    campaignName?: string,
    stepName?: string,
    delayMs?: number, // Optional delay for scheduled steps
    stepOrder?: number, // Step order for priority calculation
  ) {
    // Create job name from campaign name + step name
    let jobName: string | undefined;
    if (campaignName && stepName) {
      jobName = `${campaignName} - ${stepName}`;
    } else if (campaignName) {
      jobName = campaignName;
    } else if (stepName) {
      jobName = stepName;
    }

    // Calculate priority: Lower stepOrder = Higher priority (Step 1 processes before Step 2)
    // Base priority is 8, subtract stepOrder to ensure sequential processing
    // Step 1: priority = 8 - 1 = 7
    // Step 2: priority = 8 - 2 = 6
    // This ensures Step 1 always processes before Step 2
    const basePriority = BullConfig.getQueuePriority(QueueName.CAMPAIGN_PROCESSOR);
    const priority = stepOrder !== undefined 
      ? Math.max(1, basePriority - stepOrder + 1) // Ensure priority is at least 1
      : basePriority;

    // Calculate delay - ensure it's not negative
    const delay = delayMs && delayMs > 0 ? delayMs : undefined;

    // Check for existing job with same jobId to avoid conflicts
    const jobId = `new-step-${campaignId}-${stepId}`;
    const conflictCheck = await this.checkJobConflict(jobId);
    
    if (conflictCheck.exists) {
      this.logger.log(
        `⚠️ Job ${jobId} already exists with state: ${conflictCheck.state}. ` +
        `${conflictCheck.isCancellable ? 'Removing existing job before creating new one.' : 'Job is not cancellable.'}`
      );
      
      if (conflictCheck.isCancellable) {
        // Remove existing job if it's cancellable
        await this.removeJob(jobId);
        this.logger.log(`🗑️ Removed existing ${conflictCheck.state} job ${jobId}`);
      } else if (conflictCheck.state === 'active') {
        // If job is active, don't remove it - just log warning
        this.logger.warn(
          `⚠️ Job ${jobId} is currently active. Will not create duplicate job. ` +
          `Wait for current job to complete.`
        );
        const existingJob = await this.getJob(jobId);
        return {
          jobId: existingJob?.id || jobId,
          campaignId,
          stepId,
          message: 'Job already exists and is active',
        };
      }
    }

    // Log delay information for debugging
    if (delayMs !== undefined) {
      if (delayMs > 0) {
        const delayMinutes = Math.round(delayMs / 1000 / 60);
        const delayHours = Math.round(delayMs / 1000 / 60 / 60);
        this.logger.log(
          `⏰ Queuing scheduled step job with delay: ${delayMs}ms (${delayMinutes} minutes / ${delayHours} hours)`
        );
      } else {
        this.logger.log(`⚡ Queuing step job immediately (delayMs=${delayMs}, will process now)`);
      }
    } else {
      this.logger.log(`⚡ Queuing step job immediately (no delay specified)`);
    }

    const job = await this.queue.add(
      'process-new-step',
      {
        campaignId,
        stepId,
        organizationId,
        triggeredBy,
        queuedAt: new Date().toISOString(),
        name: jobName, // Job name for identification: campaign name + step name
      },
      {
        jobId, // Use consistent jobId
        delay, // If delay is provided, BullMQ will wait before processing
        priority, // High priority for campaign processing
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );

    const jobState = await job.getState();
    this.logger.log(
      `✅ Queued new step processing job: ${job.id} for step: ${stepId} in campaign: ${campaignId}, ` +
      `state: ${jobState}, delay: ${delay ? `${Math.round(delay / 1000 / 60)} minutes` : 'none'}`
    );

    return {
      jobId: job.id,
      campaignId,
      stepId,
      message: 'New step queued for processing',
    };
  }

  /**
   * Cancel all jobs for a campaign
   * Optimized: Uses predictable jobId patterns and efficient filtering
   * Time Complexity: O(M) where M = known job IDs + step count (much better than O(N) full scan)
   */
  async cancelCampaignJobs(campaignId: string): Promise<number> {
    let cancelled = 0;
    const cancelledJobIds = new Set<string>();

    // Phase 1: Cancel known job ID patterns (O(1) per job)
    const knownJobIds = [`campaign-${campaignId}`];
    const knownJobs = await Promise.all(
      knownJobIds.map((jobId) => this.queue.getJob(jobId)),
    );

    for (const job of knownJobs) {
      if (job) {
        const conflictCheck = await this.checkJobConflict(job.id as string);
        if (conflictCheck.isCancellable) {
          await this.removeJob(job.id as string);
          cancelledJobIds.add(job.id as string);
          cancelled++;
        }
      }
    }

    // Phase 2: Fetch jobs with pagination and filter by campaignId in data
    // Limit to reasonable page size to avoid memory issues
    const PAGE_SIZE = 100;
    let start = 0;
    let hasMore = true;

    while (hasMore) {
      // Fetch jobs in batches to avoid loading all jobs into memory
      const [waitingJobs, delayedJobs, activeJobs] = await Promise.all([
        this.queue.getJobs('waiting', start, start + PAGE_SIZE - 1),
        this.queue.getJobs('delayed', start, start + PAGE_SIZE - 1),
        this.queue.getJobs('active', start, start + PAGE_SIZE - 1),
      ]);

      const allBatchJobs = [...waitingJobs, ...delayedJobs, ...activeJobs];
      
      // Filter jobs matching this campaign (either by jobId pattern or data.campaignId)
      const campaignJobs = allBatchJobs.filter(
        (j) => {
          if (cancelledJobIds.has(j.id as string)) return false; // Skip already cancelled
          const jobId = j.id as string;
          const data = j.data;
          return (
            (typeof jobId === 'string' && jobId.startsWith(`new-step-${campaignId}-`)) ||
            data?.campaignId === campaignId
          );
        },
      );

      // Cancel matching jobs
      for (const job of campaignJobs) {
        const conflictCheck = await this.checkJobConflict(job.id as string);
        if (conflictCheck.isCancellable) {
          await this.removeJob(job.id as string);
          cancelledJobIds.add(job.id as string);
          cancelled++;
        }
      }

      // Check if there are more jobs to process
      hasMore = allBatchJobs.length === PAGE_SIZE;
      start += PAGE_SIZE;
    }

    this.logger.log(`Cancelled ${cancelled} campaign processing jobs for campaign ${campaignId}`);
    return cancelled;
  }

  /**
   * Cancel a specific step job by campaignId and stepId
   * Used when step is updated or deleted
   * Optimized: Uses checkJobConflict helper
   */
  async cancelStepJob(campaignId: string, stepId: string): Promise<boolean> {
    const jobId = `new-step-${campaignId}-${stepId}`;
    const conflictCheck = await this.checkJobConflict(jobId);
    
    if (!conflictCheck.exists) {
      this.logger.debug(`No job found for step ${stepId} in campaign ${campaignId}`);
      return false;
    }

    if (conflictCheck.isCancellable) {
      await this.removeJob(jobId);
      this.logger.log(`Cancelled step job ${jobId} (state: ${conflictCheck.state})`);
      return true;
    } else {
      this.logger.debug(`Step job ${jobId} is in state ${conflictCheck.state}, cannot cancel`);
      return false;
    }
  }
}

