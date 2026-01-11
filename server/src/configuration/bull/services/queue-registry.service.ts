import { Injectable } from '@nestjs/common';
import { BaseQueueService } from './base-queue.service';
import { QueueName } from '../enums/queue.enum';
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

/**
 * Queue Registry Service
 * Centralized registry for all queues in the system
 * Provides single source of truth for queue configuration and mapping
 */
@Injectable()
export class QueueRegistryService {
  /**
   * Get all registered queue names
   */
  static getAllQueueNames(): QueueName[] {
    return [
      QueueName.EMAIL,
      QueueName.FILE_PROCESSING,
      QueueName.NOTIFICATION,
      QueueName.CLEANUP,
      QueueName.CONTACT_BULK_UPLOAD,
      QueueName.CAMPAIGN_PROCESSOR,
      QueueName.EMAIL_SENDER,
      QueueName.DEAD_LETTER,
      QueueName.BOUNCE_DETECTION,
      QueueName.REPLY_DETECTION,
      QueueName.SUBSCRIPTION,
    ];
  }

  /**
   * Map queue names to queue instances
   * Used by controllers and health services
   */
  static mapQueuesToInstances(queues: {
    emailQueue: EmailQueue;
    fileProcessingQueue: FileProcessingQueue;
    notificationQueue: NotificationQueue;
    cleanupQueue: CleanupQueue;
    contactBulkUploadQueue: ContactBulkUploadQueue;
    campaignProcessorQueue: CampaignProcessorQueue;
    emailSenderQueue: EmailSenderQueue;
    deadLetterQueue: DeadLetterQueue;
    bounceDetectionQueue: BounceDetectionQueue;
    replyDetectionQueue: ReplyDetectionQueue;
    subscriptionQueue: SubscriptionQueue;
  }): Map<string, BaseQueueService> {
    return new Map<string, BaseQueueService>([
      ['email', queues.emailQueue],
      ['file-processing', queues.fileProcessingQueue],
      ['notification', queues.notificationQueue],
      ['cleanup', queues.cleanupQueue],
      ['contact-bulk-upload', queues.contactBulkUploadQueue],
      ['campaign-processor', queues.campaignProcessorQueue],
      ['email-sender', queues.emailSenderQueue],
      ['dead-letter', queues.deadLetterQueue],
      ['bounce-detection', queues.bounceDetectionQueue],
      ['reply-detection', queues.replyDetectionQueue],
      ['subscription', queues.subscriptionQueue],
    ]);
  }

  /**
   * Get all queues for health/metrics reporting
   */
  static getAllQueuesForHealth(queues: {
    emailQueue: EmailQueue;
    fileProcessingQueue: FileProcessingQueue;
    notificationQueue: NotificationQueue;
    cleanupQueue: CleanupQueue;
    contactBulkUploadQueue: ContactBulkUploadQueue;
    campaignProcessorQueue: CampaignProcessorQueue;
    emailSenderQueue: EmailSenderQueue;
    deadLetterQueue: DeadLetterQueue;
    bounceDetectionQueue: BounceDetectionQueue;
    replyDetectionQueue: ReplyDetectionQueue;
    subscriptionQueue: SubscriptionQueue;
  }): Array<{ name: string; queue: BaseQueueService }> {
    return [
      { name: QueueName.EMAIL, queue: queues.emailQueue },
      { name: QueueName.FILE_PROCESSING, queue: queues.fileProcessingQueue },
      { name: QueueName.NOTIFICATION, queue: queues.notificationQueue },
      { name: QueueName.CLEANUP, queue: queues.cleanupQueue },
      {
        name: QueueName.CONTACT_BULK_UPLOAD,
        queue: queues.contactBulkUploadQueue,
      },
      {
        name: QueueName.CAMPAIGN_PROCESSOR,
        queue: queues.campaignProcessorQueue,
      },
      { name: QueueName.EMAIL_SENDER, queue: queues.emailSenderQueue },
      { name: QueueName.DEAD_LETTER, queue: queues.deadLetterQueue },
      {
        name: QueueName.BOUNCE_DETECTION,
        queue: queues.bounceDetectionQueue,
      },
      {
        name: QueueName.REPLY_DETECTION,
        queue: queues.replyDetectionQueue,
      },
      { name: QueueName.SUBSCRIPTION, queue: queues.subscriptionQueue },
    ];
  }
}

