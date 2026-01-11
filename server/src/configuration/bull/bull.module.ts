import { Module, Global, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BullModule as NestBullModule } from '@nestjs/bullmq';
import { QueueName } from './enums/queue.enum';
import { BullConfig } from './config/bull.config';

// Queues
import { EmailQueue } from './queues/email.queue';
import { FileProcessingQueue } from './queues/file-processing.queue';
import { NotificationQueue } from './queues/notification.queue';
import { CleanupQueue } from './queues/cleanup.queue';
import { ContactBulkUploadQueue } from './queues/contact-bulk-upload.queue';
import { CampaignProcessorQueue } from './queues/campaign-processor.queue';
import { EmailSenderQueue } from './queues/email-sender.queue';
import { DeadLetterQueue } from './queues/dead-letter.queue';
import { BounceDetectionQueue } from './queues/bounce-detection.queue';
import { ReplyDetectionQueue } from './queues/reply-detection.queue';
import { SubscriptionQueue } from './queues/subscription.queue';

// Services & Controller (NO PROCESSORS - they run in separate worker process)
import { BullBoardService } from './services/bull-board.service';
import { QueueHealthService } from './services/queue-health.service';
import { BullController } from './bull.controller';
import { AuditLogsModule } from 'src/resources/audit-logs/audit-logs.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    HttpModule,
    AuditLogsModule, // For audit logging in queue services
    // Initialize BullMQ with Redis connection for workers
    NestBullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          connection: BullConfig.getConnectionConfig(configService),
        };
      },
      inject: [ConfigService],
    }),
    // Register all queues for worker processing
    NestBullModule.registerQueue({ name: QueueName.EMAIL }),
    NestBullModule.registerQueue({ name: QueueName.FILE_PROCESSING }),
    NestBullModule.registerQueue({ name: QueueName.NOTIFICATION }),
    NestBullModule.registerQueue({ name: QueueName.CLEANUP }),
    NestBullModule.registerQueue({ name: QueueName.CONTACT_BULK_UPLOAD }),
    NestBullModule.registerQueue({ name: QueueName.CAMPAIGN_PROCESSOR }),
    NestBullModule.registerQueue({ name: QueueName.EMAIL_SENDER }),
    NestBullModule.registerQueue({ name: QueueName.DEAD_LETTER }),
    NestBullModule.registerQueue({ name: QueueName.BOUNCE_DETECTION }),
    NestBullModule.registerQueue({ name: QueueName.REPLY_DETECTION }),
    NestBullModule.registerQueue({ name: QueueName.SUBSCRIPTION }),
  ],
  controllers: [BullController],
  providers: [
    // Queue Services (for creating jobs)
    EmailQueue,
    FileProcessingQueue,
    NotificationQueue,
    CleanupQueue,
    ContactBulkUploadQueue,
    CampaignProcessorQueue,
    EmailSenderQueue,
    DeadLetterQueue,
    BounceDetectionQueue,
    ReplyDetectionQueue,
    SubscriptionQueue,

    // Bull Board (monitoring UI)
    BullBoardService,
    // Health Check Service
    QueueHealthService,

    // NOTE: Processors are NOT included here!
    // They run in a separate worker process (see worker.module.ts)
    // This separation allows:
    // - API server to stay responsive during heavy job processing
    // - Horizontal scaling of workers independently
    // - Worker crashes don't affect API server
  ],
  exports: [
    EmailQueue,
    FileProcessingQueue,
    NotificationQueue,
    CleanupQueue,
    ContactBulkUploadQueue,
    CampaignProcessorQueue,
    EmailSenderQueue,
    DeadLetterQueue,
    BounceDetectionQueue,
    ReplyDetectionQueue,
    SubscriptionQueue,
    BullBoardService,
    QueueHealthService,
  ],
})
export class BullModule implements OnModuleInit {
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
  ) {}

  async onModuleInit() {
    console.log(
      '🚀 BullMQ Module Initialized (API Server - Queue Producer Only)',
    );
    console.log('📊 Bull Board Dashboard: http://localhost:4000/admin/queues');
    console.log('');
    console.log('⚠️  IMPORTANT: No processors running in this process!');
    console.log('   Start worker process separately: npm run start:worker');
    console.log('');

    // Log queue metrics with error handling
    try {
      const emailMetrics = await this.emailQueue.getMetrics();
      const fileMetrics = await this.fileProcessingQueue.getMetrics();
      const notificationMetrics = await this.notificationQueue.getMetrics();
      const cleanupMetrics = await this.cleanupQueue.getMetrics();
      const contactBulkMetrics = await this.contactBulkUploadQueue.getMetrics();
      const campaignProcessorMetrics = await this.campaignProcessorQueue.getMetrics();
      const emailSenderMetrics = await this.emailSenderQueue.getMetrics();
      const bounceDetectionMetrics = await this.bounceDetectionQueue.getMetrics();
      const replyDetectionMetrics = await this.replyDetectionQueue.getMetrics();

      console.log('📧 Email Queue:', emailMetrics.counts);
      console.log('📁 File Processing Queue:', fileMetrics.counts);
      console.log('🔔 Notification Queue:', notificationMetrics.counts);
      console.log('🧹 Cleanup Queue:', cleanupMetrics.counts);
      console.log('👥 Contact Bulk Upload Queue:', contactBulkMetrics.counts);
      console.log('📬 Campaign Processor Queue:', campaignProcessorMetrics.counts);
      console.log('✉️  Email Sender Queue:', emailSenderMetrics.counts);
      console.log('📧 Bounce Detection Queue:', bounceDetectionMetrics);
      console.log('📬 Reply Detection Queue:', replyDetectionMetrics);
    } catch (error) {
      console.warn('⚠️  Could not fetch queue metrics - Redis may not be available');
      console.warn('💡 Make sure Redis is running or start it with: redis-server');
      console.warn('   The server will start but queue functionality will be limited');
    }
  }
}
