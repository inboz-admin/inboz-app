import { ConfigService } from '@nestjs/config';
import { QueueOptions, WorkerOptions } from 'bullmq';
import { QueueName } from '../enums/queue.enum';

export class BullConfig {
  static getConnectionConfig(configService: ConfigService) {
    return {
      host: configService.get('REDIS_HOST') || 'localhost',
      port: configService.get('REDIS_PORT') || 6379,
      password: configService.get('REDIS_PASSWORD'),
      db: configService.get('REDIS_DB') || 0,
      maxRetriesPerRequest: 3, // Limit retries to prevent blocking
      enableReadyCheck: false,
      retryStrategy: (times: number) => {
        // Exponential backoff with max delay
        const delay = Math.min(times * 50, 2000);
        // Stop retrying after 10 attempts (about 5 seconds)
        if (times > 10) {
          return null; // Stop retrying
        }
        return delay;
      },
      reconnectOnError: (err: Error) => {
        // Only reconnect on specific errors
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
      // Don't fail on connection errors immediately
      lazyConnect: false,
    };
  }

  static getDefaultQueueOptions(
    configService: ConfigService,
  ): Partial<QueueOptions> {
    return {
      connection: this.getConnectionConfig(configService),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600, // keep up to 24 hours
          count: 1000, // keep up to 1000 jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // keep up to 7 days (for debugging)
          count: 500, // keep up to 500 failed jobs
        },
      },
    };
  }

  static getDefaultWorkerOptions(
    configService: ConfigService,
  ): Partial<WorkerOptions> {
    return {
      connection: this.getConnectionConfig(configService),
      concurrency: configService.get('BULL_CONCURRENCY') || 5,
      limiter: {
        max: 10,
        duration: 1000,
      },
    };
  }

  /**
   * Get queue-specific worker options (concurrency and rate limits)
   * Each queue has different processing requirements
   */
  static getQueueSpecificWorkerOptions(
    queueName: string,
    configService?: ConfigService,
  ): Partial<WorkerOptions> {
    const defaultConcurrency = configService?.get('BULL_CONCURRENCY') || 5;
    
    const specificOptions: Record<string, Partial<WorkerOptions>> = {
      [QueueName.EMAIL_SENDER]: {
        concurrency: 20, // Higher concurrency for email sending (scaled for 3 worker instances)
        limiter: {
          max: 40, // Increased rate limit per worker (3 workers = 120 jobs/sec total capacity)
          duration: 1000, // Per second
        },
      },
      [QueueName.CAMPAIGN_PROCESSOR]: {
        concurrency: 1, // Sequential processing to ensure quota is checked correctly (Step 1 before Step 2)
        limiter: {
          max: 5, // Prevent overwhelming database
          duration: 1000,
        },
      },
      [QueueName.CONTACT_BULK_UPLOAD]: {
        concurrency: 3, // Moderate for file processing
        limiter: {
          max: 10,
          duration: 1000,
        },
      },
      [QueueName.FILE_PROCESSING]: {
        concurrency: 4, // Moderate for file operations
        limiter: {
          max: 10,
          duration: 1000,
        },
      },
      [QueueName.CLEANUP]: {
        concurrency: 1, // Sequential cleanup to avoid resource conflicts
        limiter: {
          max: 5,
          duration: 1000,
        },
      },
      [QueueName.NOTIFICATION]: {
        concurrency: defaultConcurrency,
        limiter: {
          max: 10,
          duration: 1000,
        },
      },
      [QueueName.EMAIL]: {
        concurrency: defaultConcurrency,
        limiter: {
          max: 10,
          duration: 1000,
        },
      },
      [QueueName.BOUNCE_DETECTION]: {
        concurrency: 5, // Moderate concurrency for detection
        limiter: {
          max: 20, // Allow more per second for detection
          duration: 1000,
        },
      },
      [QueueName.REPLY_DETECTION]: {
        concurrency: 5, // Moderate concurrency for detection
        limiter: {
          max: 20, // Allow more per second for detection
          duration: 1000,
        },
      },
      [QueueName.SUBSCRIPTION]: {
        concurrency: 3, // Moderate concurrency for subscription creation
        limiter: {
          max: 10,
          duration: 1000,
        },
      },
    };

    return specificOptions[queueName] || {
      concurrency: defaultConcurrency,
      limiter: {
        max: 10,
        duration: 1000,
      },
    };
  }

  /**
   * Get default priority for a queue (1-10, higher = more priority)
   */
  static getQueuePriority(queueName: string): number {
    const priorities: Record<string, number> = {
      [QueueName.EMAIL_SENDER]: 10, // Highest priority - time-sensitive
      [QueueName.CAMPAIGN_PROCESSOR]: 8, // High priority - user-initiated
      [QueueName.EMAIL]: 7, // High priority - email operations
      [QueueName.BOUNCE_DETECTION]: 6, // Medium-high priority - important for deliverability
      [QueueName.REPLY_DETECTION]: 6, // Medium-high priority - important for engagement
      [QueueName.CONTACT_BULK_UPLOAD]: 5, // Medium priority - user-initiated but can wait
      [QueueName.FILE_PROCESSING]: 5, // Medium priority
      [QueueName.SUBSCRIPTION]: 7, // High priority - important for new organizations
      [QueueName.NOTIFICATION]: 3, // Low-medium priority
      [QueueName.CLEANUP]: 1, // Lowest priority - background maintenance
    };

    return priorities[queueName] || 5; // Default medium priority
  }

  static getQueueSpecificOptions(queueName: string): Partial<QueueOptions> {
    const specificOptions: Record<string, Partial<QueueOptions>> = {
      [QueueName.EMAIL]: {
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
        },
      },
      [QueueName.FILE_PROCESSING]: {
        defaultJobOptions: {
          attempts: 3,
        },
      },
      [QueueName.CLEANUP]: {
        defaultJobOptions: {
          attempts: 2,
          removeOnComplete: true,
        },
      },
    };

    return specificOptions[queueName] || {};
  }
}
