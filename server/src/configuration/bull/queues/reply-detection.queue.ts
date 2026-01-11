import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { BaseQueueService } from '../services/base-queue.service';
import { BullConfig } from '../config/bull.config';
import { QueueName } from '../enums/queue.enum';

/**
 * Queue Service for Reply Detection
 * Manages job creation for checking individual Gmail accounts for reply emails
 */
@Injectable()
export class ReplyDetectionQueue
  extends BaseQueueService
  implements OnModuleInit
{
  protected readonly logger = new Logger(ReplyDetectionQueue.name);
  protected readonly queue: Queue;

  constructor(private readonly configService: ConfigService) {
    super();
    this.queue = BaseQueueService.createQueue(
      QueueName.REPLY_DETECTION,
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
    this.logger.log('ReplyDetectionQueue initialized');
  }

  /**
   * Add a reply detection job for a specific user account
   * Uses unique job IDs to track all jobs (not just the latest one)
   * Only skips if a job is already waiting/delayed to prevent duplicate queuing for the same interval
   */
  async addReplyDetectionJob(
    userId: string,
    userEmail: string,
    priority: number = 5,
  ) {
    const baseJobId = `reply-${userId}`;
    const uniqueJobId = `${baseJobId}-${Date.now()}`;
    
    // Check if there's already a waiting, delayed, or recently created active job for this user
    // This prevents duplicate queuing for the same interval
    const [waitingJobs, delayedJobs, activeJobs] = await Promise.all([
      this.queue.getJobs('waiting', 0, 100),
      this.queue.getJobs('delayed', 0, 100),
      this.queue.getJobs('active', 0, 100),
    ]);
    
    // Check for pending jobs (waiting/delayed)
    const hasPendingJob = [...waitingJobs, ...delayedJobs].some(
      job => job.id?.startsWith(baseJobId)
    );
    
    // Check for recently created active jobs (within last 2 minutes to prevent same-interval duplicates)
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    const hasRecentActiveJob = activeJobs.some(
      job => job.id?.startsWith(baseJobId) && job.timestamp && job.timestamp > twoMinutesAgo
    );
    
    if (hasPendingJob || hasRecentActiveJob) {
      this.logger.log(
        `⏭️  Reply detection job already queued/active for user ${userEmail} (pending: ${hasPendingJob}, recent active: ${hasRecentActiveJob}), skipping to prevent duplicate`,
      );
      // Return the first pending job found, or null if only active job exists
      const pendingJob = [...waitingJobs, ...delayedJobs].find(
        job => job.id?.startsWith(baseJobId)
      );
      return pendingJob || null;
    }

    // Always create a new job with unique ID to track all jobs
    // Completed/failed jobs will be auto-removed by removeOnComplete/removeOnFail settings
    this.logger.debug(
      `➕ Creating new reply detection job for user ${userEmail} (jobId: ${uniqueJobId})`,
    );
    const job = await this.queue.add(
      'check-replies',
      {
        userId,
        userEmail,
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
      `Queued reply detection job: ${job.id} for user ${userEmail}`,
    );

    return job;
  }

  /**
   * Add multiple reply detection jobs for multiple accounts
   */
  async addReplyDetectionJobs(
    accounts: Array<{ userId: string; userEmail: string; priority?: number }>,
  ) {
    const jobs = await Promise.all(
      accounts.map((account) =>
        this.addReplyDetectionJob(
          account.userId,
          account.userEmail,
          account.priority || 5,
        ),
      ),
    );

    this.logger.log(
      `Queued ${jobs.length} reply detection jobs`,
    );

    return jobs;
  }

  /**
   * Reschedule a reply detection job
   */
  async rescheduleReplyDetectionJob(
    userId: string,
    delayMs: number,
  ): Promise<void> {
    try {
      const job = await this.queue.getJob(`reply-${userId}`);
      if (job) {
        await job.remove(); // Remove existing job
      }

      // Add new job with delay
      await this.addReplyDetectionJob(userId, '', 5);
      this.logger.debug(
        `Rescheduled reply detection job for user ${userId} with delay ${delayMs}ms`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error rescheduling reply detection job for user ${userId}: ${err.message}`,
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

