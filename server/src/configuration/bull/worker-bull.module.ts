import { Module, Global, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BullModule as NestBullModule } from '@nestjs/bullmq';
import { SequelizeModule } from '@nestjs/sequelize';
import { QueueName } from './enums/queue.enum';
import { BullConfig } from './config/bull.config';

// Queue Services
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

// Processors
import { EmailProcessor } from './processors/email.processor';
import { FileProcessingProcessor } from './processors/file-processing.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { CleanupProcessor } from './processors/cleanup.processor';
import { ContactBulkUploadProcessor } from './processors/contact-bulk-upload.processor';
import { CampaignProcessorProcessor } from './processors/campaign-processor.processor';
import { EmailSenderProcessor } from './processors/email-sender.processor';
import { DeadLetterProcessor } from './processors/dead-letter.processor';
import { BounceDetectionProcessor } from './processors/bounce-detection.processor';
import { ReplyDetectionProcessor } from './processors/reply-detection.processor';
import { SubscriptionProcessor } from './processors/subscription.processor';

// Dependencies
import { EmailService } from '../email/email.service';
import { ExcelService } from '../excel/excel.service';
import { EmailPersonalizationService } from 'src/common/services/email-personalization.service';
import { RateLimiterService } from 'src/common/services/rate-limiter.service';
import { BounceDetectionService } from 'src/common/services/bounce-detection.service';
import { ReplyDetectionService } from 'src/common/services/reply-detection.service';
import { TokenRefreshService } from 'src/common/services/token-refresh.service';
import { CircuitBreakerService } from 'src/common/services/circuit-breaker.service';

// Entities needed by processors
import { Campaign } from 'src/resources/campaigns/entities/campaign.entity';
import { CampaignStep } from 'src/resources/campaigns/entities/campaign-step.entity';
import { EmailMessage } from 'src/resources/campaigns/entities/email-message.entity';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import { ContactListMember } from 'src/resources/contact-lists/entities/contact-list-member.entity';
import { EmailTemplate } from 'src/resources/email-templates/entities/email-template.entity';
import { GmailOAuthToken } from 'src/resources/users/entities/gmail-oauth-token.entity';
import { User } from 'src/resources/users/entities/user.entity';

// Import WsModule for WsGateway
import { WsModule } from 'src/resources/ws/ws.module';
// Import CampaignsModule for CampaignSchedulingService
import { CampaignsModule } from 'src/resources/campaigns/campaigns.module';
// Import SubscriptionsModule for subscription services
import { SubscriptionsModule } from 'src/resources/subscriptions/subscriptions.module';
// Import AuditLogsModule for audit logging in processors
import { AuditLogsModule } from 'src/resources/audit-logs/audit-logs.module';
import { NotificationsModule } from 'src/resources/notifications/notifications.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    HttpModule,
    WsModule, // Needed for WsGateway in processors
    CampaignsModule, // Needed for CampaignSchedulingService in processors
    SubscriptionsModule, // Needed for subscription services in subscription processor
    AuditLogsModule, // Needed for audit logging in processors
    NotificationsModule, // Needed for notification services in processors
    // Register entities needed by campaign processors
    SequelizeModule.forFeature([
      Campaign,
      CampaignStep,
      EmailMessage,
      Contact,
      ContactListMember,
      EmailTemplate,
      GmailOAuthToken,
      User,
    ]),
    NestBullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          connection: BullConfig.getConnectionConfig(configService),
        };
      },
      inject: [ConfigService],
    }),
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
  providers: [
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
    EmailProcessor,
    FileProcessingProcessor,
    NotificationProcessor,
    CleanupProcessor,
    ContactBulkUploadProcessor,
    CampaignProcessorProcessor,
    EmailSenderProcessor,
    DeadLetterProcessor,
    BounceDetectionProcessor,
    ReplyDetectionProcessor,
    SubscriptionProcessor,
    EmailService,
    ExcelService,
    EmailPersonalizationService,
    RateLimiterService,
    BounceDetectionService,
    ReplyDetectionService,
    TokenRefreshService,
    CircuitBreakerService,
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
  ],
})
export class WorkerBullModule implements OnModuleInit {
  private readonly logger = new Logger(WorkerBullModule.name);

  async onModuleInit() {
    this.logger.log('🔧 Worker BullMQ Module Initialized');
    try {
      // Test Redis connection by checking if we can access queues
      this.logger.log('👷 Workers ready to process jobs from Redis');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`⚠️ Redis connection issue detected: ${errorMessage}. Workers may not function properly.`);
      this.logger.warn('💡 Make sure Redis is running or start it with: redis-server');
    }
  }
}
