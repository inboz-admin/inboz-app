import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { BaseQueueService } from '../services/base-queue.service';
import { BullConfig } from '../config/bull.config';
import { QueueName } from '../enums/queue.enum';
import { AuditLogsService } from 'src/resources/audit-logs/audit-logs.service';
import { AuditAction } from 'src/resources/audit-logs/entities/audit-log.entity';

/**
 * Queue Service for Contact Bulk Upload
 * Manages job creation and monitoring for bulk contact uploads
 * Uses the same Redis connection as other queues in the app
 */
@Injectable()
export class ContactBulkUploadQueue
  extends BaseQueueService
  implements OnModuleInit
{
  protected readonly logger = new Logger(ContactBulkUploadQueue.name);
  protected readonly queue: Queue;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
  ) {
    super();
    this.queue = BaseQueueService.createQueue(
      QueueName.CONTACT_BULK_UPLOAD,
      configService,
      {
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      },
    );
  }

  async onModuleInit() {
    this.logger.log('ContactBulkUploadQueue initialized');
  }

  /**
   * Add a bulk upload job to the queue
   * Custom method to avoid conflict with BaseQueueService.addJob()
   */
  async addBulkUploadJob(
    fileId: string,
    filePath: string,
    organizationId: string,
    userId?: string,
  ) {
    const job = await this.queue.add(
      'process-bulk-upload',
      {
        fileId,
        filePath,
        organizationId,
        userId,
      },
      {
        jobId: fileId, // Use fileId as jobId for easy tracking
        attempts: 3, // Retry up to 3 times on failure
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5s delay between retries
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 100, // Keep last 100 failed jobs
      },
    );

    this.logger.log(`Queued bulk upload job: ${job.id}`);

    // Log job scheduling in audit log
    try {
      await this.auditLogsService.createAuditLog({
        organizationId: organizationId,
        performedByUserId: userId,
        module: 'CONTACTS',
        action: AuditAction.CREATE,
        recordId: fileId,
        description: `Bulk upload job scheduled for contacts`,
        details: {
          jobId: job.id,
          fileId: fileId,
          queueName: QueueName.CONTACT_BULK_UPLOAD,
          organizationId: organizationId,
          userId: userId,
        },
      });
    } catch (error) {
      this.logger.warn('Failed to log bulk upload job scheduling:', error);
    }

    return {
      jobId: job.id,
      fileId,
      message: 'File queued for processing',
    };
  }

  /**
   * Add a bulk upload job with automatic retry and reconnection
   * Retries up to 5 times with exponential backoff if Redis connection fails
   */
  async addBulkUploadJobWithRetry(
    fileId: string,
    filePath: string,
    organizationId: string,
    userId?: string,
    maxRetries: number = 5,
  ) {
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Check if queue connection is healthy
        const isReady = await this.checkQueueConnection();
        if (!isReady) {
          throw new Error('Redis connection not available');
        }

        // Try to add job
        return await this.addBulkUploadJob(fileId, filePath, organizationId, userId);
      } catch (error) {
        attempt++;
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const errorMessage = lastError.message.toLowerCase();
        const isConnectionError = 
          errorMessage.includes('econnrefused') ||
          errorMessage.includes('connection') ||
          errorMessage.includes('redis') ||
          errorMessage.includes('connect');

        if (!isConnectionError || attempt >= maxRetries) {
          // If it's not a connection error, or we've exhausted retries, throw
          this.logger.error(
            `Failed to queue bulk upload job after ${attempt} attempts: ${lastError.message}`,
          );
          throw lastError;
        }

        // Calculate delay with exponential backoff (1s, 2s, 4s, 8s, 16s)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 16000);
        
        this.logger.warn(
          `⚠️ Redis connection failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`,
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Try to reconnect
        try {
          await this.reconnectQueue();
        } catch (reconnectError) {
          this.logger.debug(
            `Reconnection attempt ${attempt} failed, will retry: ${reconnectError instanceof Error ? reconnectError.message : String(reconnectError)}`,
          );
        }
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError || new Error('Failed to queue job after all retries');
  }

  /**
   * Check if queue connection is healthy
   */
  async checkQueueConnection(): Promise<boolean> {
    try {
      // Try to get queue metrics (lightweight operation)
      await this.queue.getWaitingCount();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Attempt to reconnect the queue
   * BullMQ handles automatic reconnection, but we can trigger a test
   */
  private async reconnectQueue(): Promise<void> {
    try {
      // Just test the connection - BullMQ will reconnect automatically
      // when we try to use it if the retry strategy is configured
      await this.queue.getWaitingCount();
      this.logger.debug('✅ Queue connection is healthy');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Queue connection check failed: ${errorMessage}`);
      // Don't throw - let the retry loop handle it
      throw error;
    }
  }

  // getJobStatus() inherited from BaseQueueService
}
