import { Injectable, OnModuleInit } from '@nestjs/common';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ConfigService } from '@nestjs/config';
import basicAuth from 'express-basic-auth';
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

@Injectable()
export class BullBoardService implements OnModuleInit {
  private serverAdapter: ExpressAdapter;

  constructor(
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
    private readonly configService: ConfigService,
  ) {
    this.serverAdapter = new ExpressAdapter();
    this.serverAdapter.setBasePath('/admin/queues');
  }

  onModuleInit() {
    // Get the actual Queue instances from the services
    const queues = [
      new BullMQAdapter(this.emailQueue['queue']),
      new BullMQAdapter(this.fileProcessingQueue['queue']),
      new BullMQAdapter(this.notificationQueue['queue']),
      new BullMQAdapter(this.cleanupQueue['queue']),
      new BullMQAdapter(this.contactBulkUploadQueue['queue']),
      new BullMQAdapter(this.campaignProcessorQueue['queue']),
      new BullMQAdapter(this.emailSenderQueue['queue']),
      new BullMQAdapter(this.deadLetterQueue['queue']),
      new BullMQAdapter(this.bounceDetectionQueue['queue']),
      new BullMQAdapter(this.replyDetectionQueue['queue']),
      new BullMQAdapter(this.subscriptionQueue['queue']),
    ];

    createBullBoard({
      queues,
      serverAdapter: this.serverAdapter,
    });
  }

  /**
   * Get authentication middleware for Bull Board
   * Uses basic authentication (username/password)
   */
  getAuthMiddleware() {
    const username = this.configService.get('BULL_BOARD_USERNAME') || 'admin';
    const password = this.configService.get('BULL_BOARD_PASSWORD') || 'admin';

    return basicAuth({
      users: { [username]: password },
      challenge: true,
      realm: 'Bull Board Dashboard',
    });
  }

  getRouter() {
    const router = this.serverAdapter.getRouter();
    // Add basic authentication middleware to all routes
    router.use(this.getAuthMiddleware());
    return router;
  }
}
