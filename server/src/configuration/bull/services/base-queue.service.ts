import { Injectable, Logger } from '@nestjs/common';
import { Queue, Job, QueueOptions } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import {
  JobData,
  JobOptions,
  JobResult,
  BulkJobData,
} from '../interfaces/queue.interface';
import { BullConfig } from '../config/bull.config';
import { QueueName } from '../enums/queue.enum';

@Injectable()
export abstract class BaseQueueService {
  protected abstract readonly logger: Logger;
  protected abstract readonly queue: Queue;

  /**
   * Factory method to create a queue instance with standard configuration
   * Eliminates duplication across all queue service constructors
   * 
   * @param queueName - Queue name enum value
   * @param configService - ConfigService instance
   * @param customOptions - Optional custom queue options to merge with defaults
   * @returns Configured Queue instance
   */
  protected static createQueue(
    queueName: QueueName,
    configService: ConfigService,
    customOptions?: Partial<QueueOptions>,
  ): Queue {
    const defaultOptions = BullConfig.getDefaultQueueOptions(configService);
    const specificOptions = BullConfig.getQueueSpecificOptions(queueName);

    return new Queue(queueName, {
      connection: defaultOptions.connection,
      defaultJobOptions: {
        ...defaultOptions.defaultJobOptions,
        ...specificOptions.defaultJobOptions,
        ...customOptions?.defaultJobOptions,
      },
      ...customOptions,
    } as any);
  }

  /**
   * Add a single job to the queue
   */
  async addJob(
    name: string,
    data: JobData,
    options?: JobOptions,
  ): Promise<Job> {
    try {
      const job = await this.queue.add(name, data, options);
      this.logger.log(`Job added: ${name} (ID: ${job.id})`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to add job ${name}:`, error);
      throw error;
    }
  }

  /**
   * Add multiple jobs in bulk
   */
  async addBulkJobs(jobs: BulkJobData[]): Promise<Job[]> {
    try {
      const addedJobs = await this.queue.addBulk(jobs);
      this.logger.log(`Bulk jobs added: ${jobs.length} jobs`);
      return addedJobs;
    } catch (error) {
      this.logger.error('Failed to add bulk jobs:', error);
      throw error;
    }
  }

  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<Job | undefined> {
    return await this.queue.getJob(jobId);
  }

  /**
   * Get jobs by state
   */
  async getJobs(
    state: 'completed' | 'failed' | 'delayed' | 'active' | 'waiting' | 'paused',
    start = 0,
    end = 100,
  ): Promise<Job[]> {
    return await this.queue.getJobs(state, start, end);
  }

  /**
   * Get job counts
   */
  async getJobCounts(): Promise<any> {
    return await this.queue.getJobCounts();
  }

  /**
   * Remove a job by ID
   */
  async removeJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Job removed: ${jobId}`);
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (job) {
      await job.retry();
      this.logger.log(`Job retried: ${jobId}`);
    }
  }

  /**
   * Clean old jobs
   */
  async cleanJobs(
    grace: number,
    limit: number,
    type: 'completed' | 'failed',
  ): Promise<string[]> {
    const cleaned = await this.queue.clean(grace, limit, type);
    this.logger.log(`Cleaned ${cleaned.length} ${type} jobs`);
    return cleaned;
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    this.logger.log('Queue paused');
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    this.logger.log('Queue resumed');
  }

  /**
   * Empty the queue (remove all jobs)
   */
  async empty(): Promise<void> {
    await this.queue.drain();
    this.logger.warn('Queue emptied');
  }

  /**
   * Get queue metrics
   */
  async getMetrics(): Promise<{
    counts: any;
    isPaused: boolean;
    name: string;
  }> {
    const counts = await this.getJobCounts();
    const isPaused = await this.queue.isPaused();

    return {
      counts,
      isPaused,
      name: this.queue.name,
    };
  }

  /**
   * Get average processing time (requires job completion tracking)
   */
  async getProcessingTime(): Promise<number | null> {
    try {
      const completedJobs = await this.getJobs('completed', 0, 100);
      if (completedJobs.length === 0) return null;

      const times = completedJobs
        .map((job) => {
          const processedAt = job.returnvalue?.metadata?.processedAt;
          const duration = job.returnvalue?.metadata?.duration;
          return duration || null;
        })
        .filter((t) => t !== null) as number[];

      if (times.length === 0) return null;
      return times.reduce((sum, t) => sum + t, 0) / times.length;
    } catch (error) {
      this.logger.warn(`Error calculating processing time: ${error}`);
      return null;
    }
  }

  /**
   * Get success rate (completed vs failed)
   */
  async getSuccessRate(): Promise<number> {
    try {
      const counts = await this.getJobCounts();
      const total = counts.completed + counts.failed;
      if (total === 0) return 100; // No jobs = 100% success
      return (counts.completed / total) * 100;
    } catch (error) {
      this.logger.warn(`Error calculating success rate: ${error}`);
      return 0;
    }
  }

  /**
   * Get queue depth (waiting + active jobs)
   */
  async getQueueDepth(): Promise<number> {
    try {
      const counts = await this.getJobCounts();
      return (counts.waiting || 0) + (counts.active || 0);
    } catch (error) {
      this.logger.warn(`Error calculating queue depth: ${error}`);
      return 0;
    }
  }

  /**
   * Get worker utilization (active jobs / concurrency)
   * Note: This is an approximation as we don't have direct access to worker count
   */
  async getWorkerUtilization(concurrency: number = 5): Promise<number> {
    try {
      const counts = await this.getJobCounts();
      const active = counts.active || 0;
      return Math.min((active / concurrency) * 100, 100);
    } catch (error) {
      this.logger.warn(`Error calculating worker utilization: ${error}`);
      return 0;
    }
  }

  /**
   * Get job status by jobId
   * Returns job state, progress, and data
   */
  async getJobStatus(jobId: string): Promise<{
    jobId: string;
    state: string;
    progress: any;
    data: any;
    returnvalue: any;
    failedReason?: string;
  } | null> {
    const job = await this.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
      jobId: job.id as string,
      state,
      progress,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  /**
   * Check if a job with the given ID exists and is in a cancellable state
   * Helper method for job conflict resolution
   * 
   * @param jobId - Job ID to check
   * @returns Object with exists flag, state, and whether it's cancellable
   */
  async checkJobConflict(jobId: string): Promise<{
    exists: boolean;
    state?: string;
    isCancellable: boolean;
  }> {
    const job = await this.getJob(jobId);

    if (!job) {
      return { exists: false, isCancellable: false };
    }

    const state = await job.getState();
    const isCancellable = ['waiting', 'delayed', 'active'].includes(state);

    return {
      exists: true,
      state,
      isCancellable,
    };
  }
}
