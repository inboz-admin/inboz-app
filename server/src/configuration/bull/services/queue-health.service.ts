import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { BullConfig } from '../config/bull.config';
import { EmailQueue } from '../queues/email.queue';
import { FileProcessingQueue } from '../queues/file-processing.queue';
import { NotificationQueue } from '../queues/notification.queue';
import { CleanupQueue } from '../queues/cleanup.queue';
import { ContactBulkUploadQueue } from '../queues/contact-bulk-upload.queue';
import { CampaignProcessorQueue } from '../queues/campaign-processor.queue';
import { EmailSenderQueue } from '../queues/email-sender.queue';
import { DeadLetterQueue } from '../queues/dead-letter.queue';
import { BounceDetectionQueue } from '../queues/bounce-detection.queue';
import { ReplyDetectionQueue } from '../queues/reply-detection.queue';
import { SubscriptionQueue } from '../queues/subscription.queue';
import { QueueRegistryService } from './queue-registry.service';

@Injectable()
export class QueueHealthService {
  private readonly logger = new Logger(QueueHealthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly emailQueue: EmailQueue,
    private readonly fileProcessingQueue: FileProcessingQueue,
    private readonly notificationQueue: NotificationQueue,
    private readonly cleanupQueue: CleanupQueue,
    private readonly contactBulkUploadQueue: ContactBulkUploadQueue,
    private readonly campaignProcessorQueue: CampaignProcessorQueue,
    private readonly emailSenderQueue: EmailSenderQueue,
    private readonly deadLetterQueue: DeadLetterQueue,
    private readonly bounceDetectionQueue: BounceDetectionQueue,
    private readonly replyDetectionQueue: ReplyDetectionQueue,
    private readonly subscriptionQueue: SubscriptionQueue,
  ) {}

  /**
   * Check Redis connection health by testing queue access
   */
  async checkRedisConnection(): Promise<{
    status: 'healthy' | 'unhealthy';
    message: string;
    latency?: number;
  }> {
    try {
      const startTime = Date.now();
      // Test Redis connection by getting queue metrics (requires Redis)
      await this.emailQueue.getMetrics();
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        message: 'Redis connection is healthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Redis connection failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get metrics for all queues
   */
  async getQueueMetrics() {
    const queues = QueueRegistryService.getAllQueuesForHealth({
      emailQueue: this.emailQueue,
      fileProcessingQueue: this.fileProcessingQueue,
      notificationQueue: this.notificationQueue,
      cleanupQueue: this.cleanupQueue,
      contactBulkUploadQueue: this.contactBulkUploadQueue,
      campaignProcessorQueue: this.campaignProcessorQueue,
      emailSenderQueue: this.emailSenderQueue,
      deadLetterQueue: this.deadLetterQueue,
      bounceDetectionQueue: this.bounceDetectionQueue,
      replyDetectionQueue: this.replyDetectionQueue,
      subscriptionQueue: this.subscriptionQueue,
    });

    const metrics = await Promise.all(
      queues.map(async ({ name, queue }) => {
        try {
          const queueMetrics = await queue.getMetrics();
          return {
            queue: name,
            ...queueMetrics.counts,
            status: 'healthy',
          };
        } catch (error) {
          return {
            queue: name,
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );

    return metrics;
  }

  /**
   * Get overall worker health status
   */
  async getWorkerHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    redis: any;
    queues: any[];
    timestamp: string;
  }> {
    const redisHealth = await this.checkRedisConnection();
    const queueMetrics = await this.getQueueMetrics();

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (redisHealth.status === 'unhealthy') {
      status = 'unhealthy';
    } else {
      const hasErrors = queueMetrics.some((m) => m.status === 'error');
      if (hasErrors) {
        status = 'degraded';
      }
    }

    return {
      status,
      redis: redisHealth,
      queues: queueMetrics,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get worker status summary
   */
  async getWorkerStatus() {
    const health = await this.getWorkerHealth();
    const totalJobs = health.queues.reduce(
      (sum, q: any) =>
        sum +
        (q.waiting || 0) +
        (q.active || 0) +
        (q.completed || 0) +
        (q.failed || 0),
      0,
    );

    return {
      overall: health.status,
      redis: health.redis.status,
      totalQueues: health.queues.length,
      totalJobs,
      timestamp: health.timestamp,
    };
  }
}

