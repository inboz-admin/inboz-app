import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JobResult } from '../interfaces/queue.interface';

export abstract class BaseProcessor {
  protected abstract readonly logger: Logger;

  /**
   * Main process method to be implemented by child classes
   */
  abstract process(job: Job): Promise<JobResult>;

  /**
   * Hook called before job processing
   */
  protected async onBefore(job: Job): Promise<void> {
    this.logger.log(
      `Processing job: ${job.name} (ID: ${job.id}, Attempt: ${job.attemptsMade + 1})`,
    );
  }

  /**
   * Hook called after successful job processing
   */
  protected async onComplete(job: Job, result: JobResult): Promise<void> {
    this.logger.log(`Job completed: ${job.name} (ID: ${job.id})`);
  }

  /**
   * Hook called after failed job processing
   */
  protected async onFailed(job: Job, error: Error): Promise<void> {
    this.logger.error(
      `Job failed: ${job.name} (ID: ${job.id}), Error: ${error.message}`,
      error.stack,
    );
  }

  /**
   * Update job progress
   */
  protected async updateProgress(
    job: Job,
    percentage: number,
    message?: string,
  ): Promise<void> {
    await job.updateProgress({
      percentage,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Validate job data
   */
  protected validateJobData(job: Job, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(
      (field) => !(field in job.data),
    );

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Create success result
   */
  protected createSuccessResult(data?: any): JobResult {
    return {
      success: true,
      data,
      metadata: {
        processedAt: new Date(),
      },
    };
  }

  /**
   * Create error result
   */
  protected createErrorResult(error: string | Error): JobResult {
    return {
      success: false,
      error: error instanceof Error ? error.message : error,
      metadata: {
        processedAt: new Date(),
      },
    };
  }

  /**
   * Safe execution wrapper
   */
  public async executeWithLogging(job: Job): Promise<JobResult> {
    const startTime = Date.now();

    try {
      await this.onBefore(job);
      const result = await this.process(job);

      result.metadata = {
        ...result.metadata,
        duration: Date.now() - startTime,
        attemptNumber: job.attemptsMade + 1,
      };

      await this.onComplete(job, result);
      return result;
    } catch (error: any) {
      await this.onFailed(job, error);
      return this.createErrorResult(error);
    }
  }
}
