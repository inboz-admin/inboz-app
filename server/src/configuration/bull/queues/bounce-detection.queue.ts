import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { BaseQueueService } from '../services/base-queue.service';
import { BullConfig } from '../config/bull.config';
import { QueueName } from '../enums/queue.enum';

/**
 * Queue Service for Bounce Detection
 * Manages job creation for checking individual Gmail accounts for bounce emails
 */
@Injectable()
export class BounceDetectionQueue
  extends BaseQueueService
  implements OnModuleInit
{
  protected readonly logger = new Logger(BounceDetectionQueue.name);
  protected readonly queue: Queue;

  constructor(private readonly configService: ConfigService) {
    super();
    this.queue = BaseQueueService.createQueue(
      QueueName.BOUNCE_DETECTION,
      configService,
      {
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000, // 5 seconds
          },
          removeOnComplete: {
            age: 24 * 3600, // Keep for 24 hours
            count: 1000,
          },
          removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
            count: 500,
          },
        },
      },
    );
  }

  async onModuleInit() {
    this.logger.log('BounceDetectionQueue initialized');
  }

  /**
   * Add a bounce detection job for a specific user account
   * Uses unique job IDs to track all jobs (not just the latest one)
   * Only skips if a job is already waiting/delayed to prevent duplicate queuing for the same interval
   */
  async addBounceDetectionJob(
    userId: string,
    userEmail: string,
    priority: number = 5,
    lastHistoryId?: string,
  ) {
    const baseJobId = `bounce-${userId}`;
    const uniqueJobId = `${baseJobId}-${Date.now()}`;
    
    // Optimized: Check for existing pending job using direct job ID lookup (O(1))
    // Try the most recent job ID pattern first (optimistic check)
    const recentJobId = `${baseJobId}-${Date.now() - 1000}`; // 1 second ago
    const recentJobCheck = await this.checkJobConflict(recentJobId);
    
    // Also check base pattern if needed (fallback for exact jobId match)
    // For unique job IDs, we use timestamp, so we check for any pending job with base prefix
    // Limit search to recent jobs only to avoid full scan
    const [waitingJobs, delayedJobs] = await Promise.all([
      this.queue.getJobs('waiting', 0, 50), // Limit to first 50 waiting jobs
      this.queue.getJobs('delayed', 0, 50), // Limit to first 50 delayed jobs
    ]);
    
    // Check for pending jobs (waiting/delayed) with matching prefix
    const hasPendingJob = [...waitingJobs, ...delayedJobs].some(
      job => typeof job.id === 'string' && job.id.startsWith(baseJobId)
    );
    
    // Check for recently created active jobs (within last 2 minutes to prevent same-interval duplicates)
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    const activeJobs = await this.queue.getJobs('active', 0, 50); // Limit to first 50 active jobs
    const hasRecentActiveJob = activeJobs.some(
      job => typeof job.id === 'string' && job.id.startsWith(baseJobId) && job.timestamp && job.timestamp > twoMinutesAgo
    );
    
    if (hasPendingJob || hasRecentActiveJob) {
      this.logger.log(
        `⏭️  Bounce detection job already queued/active for user ${userEmail} (pending: ${hasPendingJob}, recent active: ${hasRecentActiveJob}), skipping to prevent duplicate`,
      );
      // Return the first pending job found, or null if only active job exists
      const pendingJob = [...waitingJobs, ...delayedJobs].find(
        job => typeof job.id === 'string' && job.id.startsWith(baseJobId)
      );
      return pendingJob || null;
    }

    // Always create a new job with unique ID to track all jobs
    // Completed/failed jobs will be auto-removed by removeOnComplete/removeOnFail settings
    this.logger.debug(
      `➕ Creating new bounce detection job for user ${userEmail} (jobId: ${uniqueJobId})`,
    );
    const job = await this.queue.add(
      'check-bounces',
      {
        userId,
        userEmail,
        lastHistoryId, // Include lastHistoryId for incremental processing
      },
      {
        jobId: uniqueJobId, // Always use unique ID to track all jobs
        priority,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
          count: 500,
        },
      },
    );

    this.logger.debug(
      `Queued bounce detection job: ${job.id} for user ${userEmail}`,
    );

    return job;
  }

  /**
   * Add multiple bounce detection jobs for multiple accounts
   */
  async addBounceDetectionJobs(
    accounts: Array<{ userId: string; userEmail: string; priority?: number }>,
  ) {
    const jobs = await Promise.all(
      accounts.map((account) =>
        this.addBounceDetectionJob(
          account.userId,
          account.userEmail,
          account.priority || 5,
        ),
      ),
    );

    this.logger.log(
      `Queued ${jobs.length} bounce detection jobs`,
    );

    return jobs;
  }

  /**
   * Reschedule a bounce detection job
   */
  async rescheduleBounceDetectionJob(
    userId: string,
    delayMs: number,
  ): Promise<void> {
    try {
      const job = await this.queue.getJob(`bounce-${userId}`);
      if (job) {
        await job.remove(); // Remove existing job
      }

      // Add new job with delay
      await this.addBounceDetectionJob(userId, '', 5);
      this.logger.debug(
        `Rescheduled bounce detection job for user ${userId} with delay ${delayMs}ms`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error rescheduling bounce detection job for user ${userId}: ${err.message}`,
      );
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  // getMetrics() inherited from BaseQueueService
}

