import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { BaseQueueService } from '../services/base-queue.service';
import { BullConfig } from '../config/bull.config';
import { QueueName } from '../enums/queue.enum';

/**
 * Queue Service for Email Sending
 * Manages job creation for individual email sending via Gmail API
 */
@Injectable()
export class EmailSenderQueue
  extends BaseQueueService
  implements OnModuleInit
{
  protected readonly logger = new Logger(EmailSenderQueue.name);
  protected readonly queue: Queue;

  constructor(private readonly configService: ConfigService) {
    super();
    this.queue = BaseQueueService.createQueue(
      QueueName.EMAIL_SENDER,
      configService,
      {
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000, // 5 seconds
          },
          removeOnComplete: 1000, // Keep more completed jobs for audit
          removeOnFail: 500,
        },
      },
    );
  }

  async onModuleInit() {
    this.logger.log('EmailSenderQueue initialized');
  }

  /**
   * Add an email sending job to the queue
   */
  async addEmailJob(
    emailMessageId: string,
    campaignId: string,
    campaignStepId: string,
    contactId: string,
    organizationId: string,
    userId: string,
    sendAt: Date,
    campaignName?: string,
    stepName?: string,
    sendFormat?: string, // Optional sendFormat from template
  ) {
    const now = Date.now();
    const sendAtTime = new Date(sendAt).getTime();
    const delayMs = Math.max(0, sendAtTime - now);

    // Create job name from campaign name + step name
    let jobName: string | undefined;
    if (campaignName && stepName) {
      jobName = `${campaignName} - ${stepName}`;
    } else if (campaignName) {
      jobName = campaignName;
    }

    // Get default priority for email-sender-queue
    const priority = BullConfig.getQueuePriority(QueueName.EMAIL_SENDER);

    const job = await this.queue.add(
      'send-email',
      {
        emailMessageId,
        campaignId,
        campaignStepId,
        contactId,
        organizationId,
        userId,
        sendAt: sendAt.toISOString(),
        queuedAt: new Date().toISOString(),
        name: jobName, // Job name for identification: campaign name + step name
        sendFormat, // Template sendFormat (HTML or TEXT)
      },
      {
        jobId: `email-${emailMessageId}`,
        delay: delayMs, // BullMQ will wait until this time to process
        priority, // High priority for email sending
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 1000,
        removeOnFail: 500,
      },
    );

    this.logger.debug(
      `Queued email sending job: ${job.id} (delay: ${Math.round(delayMs / 1000)}s)`,
    );

    return {
      jobId: job.id,
      emailMessageId,
      delayMs,
      message: 'Email queued for sending',
    };
  }

  /**
   * Add multiple email sending jobs to the queue in batch (OPTIMIZATION: Issue #6)
   * Uses BullMQ's addBulk() for efficient batch job creation
   */
  async addEmailJobs(
    jobs: Array<{
      emailMessageId: string;
      campaignId: string;
      campaignStepId: string;
      contactId: string;
      organizationId: string;
      userId: string;
      sendAt: Date;
      campaignName?: string;
      stepName?: string;
      sendFormat?: string; // Template sendFormat (HTML or TEXT)
    }>,
  ): Promise<{ queued: number; errors: number }> {
    if (jobs.length === 0) {
      return { queued: 0, errors: 0 };
    }

    const now = Date.now();
    const queueJobs = jobs.map((jobData) => {
      const sendAtTime = new Date(jobData.sendAt).getTime();
      const delayMs = Math.max(0, sendAtTime - now);

      // Create job name from campaign name + step name
      let jobName: string | undefined;
      if (jobData.campaignName && jobData.stepName) {
        jobName = `${jobData.campaignName} - ${jobData.stepName}`;
      } else if (jobData.campaignName) {
        jobName = jobData.campaignName;
      }

      return {
        name: 'send-email',
        data: {
          emailMessageId: jobData.emailMessageId,
          campaignId: jobData.campaignId,
          campaignStepId: jobData.campaignStepId,
          contactId: jobData.contactId,
          organizationId: jobData.organizationId,
          userId: jobData.userId,
          sendAt: jobData.sendAt.toISOString(),
          queuedAt: new Date().toISOString(),
          name: jobName,
          sendFormat: jobData.sendFormat, // Template sendFormat (HTML or TEXT)
        },
        opts: {
          jobId: `email-${jobData.emailMessageId}`,
          delay: delayMs,
          priority: BullConfig.getQueuePriority(QueueName.EMAIL_SENDER), // High priority
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 1000,
          removeOnFail: 500,
        },
      };
    });

    try {
      const addedJobs = await this.queue.addBulk(queueJobs);
      const queued = addedJobs.length;
      
      this.logger.log(
        `Batch queued ${queued} email sending jobs (batch size: ${jobs.length})`,
      );

      return {
        queued,
        errors: jobs.length - queued,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error batch queueing email jobs: ${err.message}`,
        err.stack,
      );
      // Fallback to individual job creation
      let queued = 0;
      let errors = 0;
      
      for (const jobData of jobs) {
        try {
          await this.addEmailJob(
            jobData.emailMessageId,
            jobData.campaignId,
            jobData.campaignStepId,
            jobData.contactId,
            jobData.organizationId,
            jobData.userId,
            jobData.sendAt,
            jobData.campaignName,
            jobData.stepName,
            jobData.sendFormat, // Pass sendFormat in fallback too
          );
          queued++;
        } catch (jobError) {
          errors++;
          this.logger.error(
            `Error queueing individual email job ${jobData.emailMessageId}: ${jobError}`,
          );
        }
      }
      
      return { queued, errors };
    }
  }

  /**
   * Cancel all email jobs for a campaign
   * Optimized: Uses emailMessageIds for direct job ID lookup when available
   * Falls back to paginated scanning when emailMessageIds not provided
   * Time Complexity: O(M) when emailMessageIds provided, O(N) with pagination when not
   */
  async cancelCampaignEmails(
    campaignId: string,
    emailMessageIds?: string[], // Optional: pre-fetched email message IDs
  ): Promise<number> {
    let cancelled = 0;
    const cancelledJobIds = new Set<string>(); // Track cancelled jobs to avoid double-counting

    // Phase 1: If emailMessageIds provided, use optimized direct lookup (O(M))
    if (emailMessageIds && emailMessageIds.length > 0) {
      const jobIds = emailMessageIds.map((id) => `email-${id}`);
      const jobs = await Promise.all(
        jobIds.map((jobId) => this.queue.getJob(jobId)),
      );

      for (const job of jobs) {
        if (job) {
          const conflictCheck = await this.checkJobConflict(job.id as string);
          if (conflictCheck.isCancellable) {
            await this.removeJob(job.id as string);
            cancelledJobIds.add(job.id as string);
            cancelled++;
          }
        }
      }
    }

    // Phase 2: Fallback sweep with pagination to catch any missed jobs
    // This handles edge cases like race conditions or jobs that weren't in the database query
    const PAGE_SIZE = 100;
    let start = 0;
    let hasMore = true;

    while (hasMore) {
      const [waitingJobs, delayedJobs, activeJobs] = await Promise.all([
        this.queue.getJobs('waiting', start, start + PAGE_SIZE - 1),
        this.queue.getJobs('delayed', start, start + PAGE_SIZE - 1),
        this.queue.getJobs('active', start, start + PAGE_SIZE - 1),
      ]);

      const allBatchJobs = [...waitingJobs, ...delayedJobs, ...activeJobs];
      const campaignJobs = allBatchJobs.filter(
        (j) => j.data?.campaignId === campaignId && !cancelledJobIds.has(j.id as string),
      );

      for (const job of campaignJobs) {
        const conflictCheck = await this.checkJobConflict(job.id as string);
        if (conflictCheck.isCancellable) {
          await this.removeJob(job.id as string);
          cancelledJobIds.add(job.id as string);
          cancelled++;
        }
      }

      hasMore = allBatchJobs.length === PAGE_SIZE;
      start += PAGE_SIZE;
    }

    this.logger.log(`Cancelled ${cancelled} email jobs for campaign ${campaignId}`);
    return cancelled;
  }

  /**
   * Reschedule an email job with a new delay
   * Removes the existing job and re-adds it with the same data but new delay
   */
  async rescheduleEmailJob(
    emailMessageId: string,
    delayMs: number,
  ): Promise<{ jobId: string; emailMessageId: string; delayMs: number }> {
    const jobId = `email-${emailMessageId}`;
    
    try {
      // Get existing job
      const existingJob = await this.queue.getJob(jobId);
      
      if (!existingJob) {
        this.logger.warn(`Job ${jobId} not found for rescheduling`);
        throw new Error(`Job ${jobId} not found`);
      }

      // Get job state
      const state = await existingJob.getState();
      
      // Only reschedule if job is in waiting, delayed, or active state
      if (!['waiting', 'delayed', 'active'].includes(state)) {
        this.logger.warn(
          `Cannot reschedule job ${jobId} in state ${state}. Only waiting, delayed, or active jobs can be rescheduled.`
        );
        throw new Error(`Cannot reschedule job in state ${state}`);
      }

      // Get job data
      const jobData = existingJob.data;
      const originalSendAt = jobData.sendAt ? new Date(jobData.sendAt) : new Date();
      
      // Calculate new send time
      const newSendAt = new Date(Date.now() + delayMs);

      // Remove existing job
      await existingJob.remove();
      this.logger.debug(`Removed existing job ${jobId} for rescheduling`);

      // Re-add job with same data but new send time and delay
      const jobName = jobData.name;
      
      const newJob = await this.queue.add(
        'send-email',
        {
          ...jobData,
          sendAt: newSendAt.toISOString(),
          queuedAt: new Date().toISOString(),
        },
        {
          jobId,
          delay: delayMs, // BullMQ will wait until this time to process
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 1000,
          removeOnFail: 500,
        },
      );

      this.logger.log(
        `Rescheduled email job ${jobId}: original send time ${originalSendAt.toISOString()}, ` +
        `new send time ${newSendAt.toISOString()} (delay: ${Math.round(delayMs / 1000)}s)`
      );

      return {
        jobId: newJob.id,
        emailMessageId,
        delayMs,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error rescheduling email job ${jobId}: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Get count of pending jobs for a campaign
   * Optimized: Can accept emailMessageIds to query specific jobs instead of all jobs
   */
  async getCampaignEmailCount(
    campaignId: string,
    emailMessageIds?: string[],
  ): Promise<{
    waiting: number;
    delayed: number;
    active: number;
    total: number;
  }> {
    if (emailMessageIds && emailMessageIds.length > 0) {
      // Optimized: Query specific jobs by jobId
      const jobIds = emailMessageIds.map((id) => `email-${id}`);
      const jobs = await Promise.all(
        jobIds.map((jobId) => this.queue.getJob(jobId)),
      );

      const counts = { waiting: 0, delayed: 0, active: 0 };
      for (const job of jobs) {
        if (job) {
          const state = await job.getState();
          if (state === 'waiting') counts.waiting++;
          else if (state === 'delayed') counts.delayed++;
          else if (state === 'active') counts.active++;
        }
      }

      return {
        ...counts,
        total: counts.waiting + counts.delayed + counts.active,
      };
    }

    // Fallback: Get all jobs and filter (less efficient)
    const [waitingJobs, delayedJobs, activeJobs] = await Promise.all([
      this.queue.getJobs(['waiting']),
      this.queue.getJobs(['delayed']),
      this.queue.getJobs(['active']),
    ]);

    const waiting = waitingJobs.filter((j) => j.data?.campaignId === campaignId).length;
    const delayed = delayedJobs.filter((j) => j.data?.campaignId === campaignId).length;
    const active = activeJobs.filter((j) => j.data?.campaignId === campaignId).length;

    return {
      waiting,
      delayed,
      active,
      total: waiting + delayed + active,
    };
  }

  /**
   * Count queued emails for a specific day for a user
   * Optimized: Uses pagination to avoid loading all jobs into memory
   * @param userId User ID to check
   * @param dayStart Start of day (midnight IST)
   * @param dayEnd End of day (midnight IST of next day)
   * @returns Count of emails scheduled for that day
   */
  async countQueuedEmailsForDay(
    userId: string,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<number> {
    try {
      const dayStartTime = dayStart.getTime();
      const dayEndTime = dayEnd.getTime();
      let count = 0;
      const PAGE_SIZE = 100;

      // Process delayed jobs in pages
      let delayedStart = 0;
      let delayedHasMore = true;
      while (delayedHasMore) {
        const delayedJobs = await this.queue.getJobs('delayed', delayedStart, delayedStart + PAGE_SIZE - 1);
        
        for (const job of delayedJobs) {
          if (job.data?.userId === userId && job.data?.sendAt) {
            const sendAt = new Date(job.data.sendAt).getTime();
            if (sendAt >= dayStartTime && sendAt < dayEndTime) {
              count++;
            }
          }
        }

        delayedHasMore = delayedJobs.length === PAGE_SIZE;
        delayedStart += PAGE_SIZE;
      }

      // Process waiting jobs in pages
      let waitingStart = 0;
      let waitingHasMore = true;
      while (waitingHasMore) {
        const waitingJobs = await this.queue.getJobs('waiting', waitingStart, waitingStart + PAGE_SIZE - 1);
        
        for (const job of waitingJobs) {
          if (job.data?.userId === userId) {
            // Get the job's scheduled time from its delay
            const jobDelay = job.opts?.delay || 0;
            const now = Date.now();
            const scheduledTime = now + jobDelay;
            
            if (scheduledTime >= dayStartTime && scheduledTime < dayEndTime) {
              count++;
            } else if (job.data?.sendAt) {
              // Also check explicit sendAt time if available
              const sendAt = new Date(job.data.sendAt).getTime();
              if (sendAt >= dayStartTime && sendAt < dayEndTime) {
                count++;
              }
            }
          }
        }

        waitingHasMore = waitingJobs.length === PAGE_SIZE;
        waitingStart += PAGE_SIZE;
      }

      return count;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error counting queued emails for day: ${err.message}`,
        err.stack,
      );
      return 0;
    }
  }
}

