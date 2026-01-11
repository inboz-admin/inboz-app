import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Job } from 'bullmq';
import { BaseQueueService } from '../services/base-queue.service';
import { BullConfig } from '../config/bull.config';
import { QueueName } from '../enums/queue.enum';

/**
 * Dead Letter Queue Service
 * Handles failed jobs from all queues after max retries
 */
@Injectable()
export class DeadLetterQueue
  extends BaseQueueService
  implements OnModuleInit
{
  protected readonly logger = new Logger(DeadLetterQueue.name);
  protected readonly queue: Queue;

  constructor(private readonly configService: ConfigService) {
    super();
    this.queue = BaseQueueService.createQueue(
      QueueName.DEAD_LETTER,
      configService,
      {
        defaultJobOptions: {
          attempts: 1, // Don't retry DLQ jobs automatically
          removeOnComplete: {
            age: 30 * 24 * 3600, // Keep for 30 days
            count: 1000,
          },
          removeOnFail: false, // Never auto-remove failed DLQ jobs
        },
      },
    );
  }

  async onModuleInit() {
    this.logger.log('DeadLetterQueue initialized');
  }

  /**
   * Add a failed job to the dead letter queue
   */
  async addFailedJob(
    originalQueue: string,
    originalJobId: string,
    jobData: any,
    error: string,
    failedAt: Date,
  ) {
    const job = await this.queue.add(
      'failed-job',
      {
        originalQueue,
        originalJobId,
        originalJobData: jobData,
        error,
        failedAt: failedAt.toISOString(),
        addedToDLQ: new Date().toISOString(),
      },
      {
        jobId: `dlq-${originalQueue}-${originalJobId}`,
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    this.logger.warn(
      `Failed job added to DLQ: ${originalJobId} from queue ${originalQueue}`,
    );

    return {
      jobId: job.id,
      originalJobId,
      originalQueue,
      message: 'Failed job added to dead letter queue',
    };
  }

  /**
   * Get all failed jobs in DLQ
   */
  async getFailedJobs(limit: number = 100) {
    const jobs = await this.queue.getJobs(['waiting', 'active', 'failed'], 0, limit - 1);
    return jobs.map((job) => ({
      jobId: job.id,
      originalQueue: job.data.originalQueue,
      originalJobId: job.data.originalJobId,
      error: job.data.error,
      failedAt: job.data.failedAt,
      addedToDLQ: job.data.addedToDLQ,
      state: job.attemptsMade > 0 ? 'failed' : 'waiting',
    }));
  }

  /**
   * Retry a failed job by moving it back to original queue
   * Note: This overrides base class method with additional parameter
   */
  async retryFailedJob(dlqJobId: string, targetQueue: Queue) {
    const dlqJob = await this.queue.getJob(dlqJobId);
    if (!dlqJob) {
      throw new Error(`DLQ job ${dlqJobId} not found`);
    }

    const originalData = dlqJob.data.originalJobData;
    const originalJobId = dlqJob.data.originalJobId;

    // Re-add to original queue
    const retryJob = await targetQueue.add(
      originalData.name || 'retry-job',
      originalData,
      {
        jobId: originalJobId,
        attempts: 3, // Reset attempts
      },
    );

    // Remove from DLQ
    await dlqJob.remove();

    this.logger.log(
      `Retried job ${originalJobId} from DLQ back to ${targetQueue.name}`,
    );

    return {
      jobId: retryJob.id,
      message: 'Job retried successfully',
    };
  }

  /**
   * Delete a job from DLQ
   */
  async deleteJob(dlqJobId: string) {
    const job = await this.queue.getJob(dlqJobId);
    if (job) {
      await job.remove();
      this.logger.log(`Deleted DLQ job ${dlqJobId}`);
      return { success: true, message: 'Job deleted from DLQ' };
    }
    return { success: false, message: 'Job not found in DLQ' };
  }

  /**
   * Get DLQ metrics (overrides base class to match signature)
   */
  async getMetrics(): Promise<{
    counts: any;
    isPaused: boolean;
    name: string;
  }> {
    const waiting = await this.queue.getWaitingCount();
    const failed = await this.queue.getFailedCount();
    const completed = await this.queue.getCompletedCount();
    const isPaused = await this.queue.isPaused();

    return {
      counts: {
        waiting,
        failed,
        completed,
        total: waiting + failed + completed,
      },
      isPaused,
      name: this.queue.name,
    };
  }
}

