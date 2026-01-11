import { Module, Global, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserContextService } from './services/user-context.service';
import { CryptoUtilityService } from './services/crypto-utility.service';
import { TransactionManager } from './services/transaction-manager.service';
import { RedisProgressService } from './services/redis-progress.service';
import { GmailService } from './services/gmail.service';
import { EmailPersonalizationService } from './services/email-personalization.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { EmailTrackingService } from './services/email-tracking.service';
import { BounceDetectionService } from './services/bounce-detection.service';
import { ReplyDetectionService } from './services/reply-detection.service';
import { ScheduledTasksService } from './services/scheduled-tasks.service';
import { NotificationsModule } from 'src/resources/notifications/notifications.module';
import { TokenRefreshService } from './services/token-refresh.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { SchedulerHealthService } from './services/scheduler-health.service';
import { DetectionCacheService } from './services/detection-cache.service';
import { AccountPriorityService } from './services/account-priority.service';
import { PlanLimitValidationService } from './services/plan-limit-validation.service';
import { SelectionSessionSchedulerService } from './services/selection-session-scheduler.service';
import { QuotaManagementService } from './services/quota-management.service';
import { UserContextInterceptor } from './interceptors/user-context.interceptor';
import { AuditLogMiddleware } from './middleware/audit-log.middleware';
import { AuditLogsModule } from 'src/resources/audit-logs/audit-logs.module';
import { SubscriptionsModule } from 'src/resources/subscriptions/subscriptions.module';
import { User } from 'src/resources/users/entities/user.entity';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import { GmailOAuthToken } from 'src/resources/users/entities/gmail-oauth-token.entity';
import { EmailTrackingEvent } from 'src/resources/campaigns/entities/email-tracking-event.entity';
import { EmailMessage } from 'src/resources/campaigns/entities/email-message.entity';
import { Campaign } from 'src/resources/campaigns/entities/campaign.entity';
import { CampaignStep } from 'src/resources/campaigns/entities/campaign-step.entity';
import { ContactListMember } from 'src/resources/contact-lists/entities/contact-list-member.entity';
import { Subscription } from 'src/resources/subscriptions/entities/subscription.entity';
import { SubscriptionPlan } from 'src/resources/subscriptions/entities/subscription-plan.entity';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CampaignsModule } from 'src/resources/campaigns/campaigns.module';
import { BullModule } from 'src/configuration/bull/bull.module';

@Global()
@Module({
  imports: [
    AuditLogsModule,
    forwardRef(() => CampaignsModule), // Forward ref to avoid circular dependency
    forwardRef(() => SubscriptionsModule), // For subscription expiry and renewal services
    forwardRef(() => NotificationsModule), // For notification services
    BullModule, // For queue services (CampaignProcessorQueue, BounceDetectionQueue, ReplyDetectionQueue) - NO processors
    SequelizeModule.forFeature([
      GmailOAuthToken,
      EmailTrackingEvent,
      EmailMessage,
      Campaign,
      CampaignStep,
      Contact,
      ContactListMember,
      User,
      Subscription,
      SubscriptionPlan,
    ]),
  ],
  providers: [
    UserContextService,
    CryptoUtilityService,
    TransactionManager,
    RedisProgressService,
    GmailService,
    EmailPersonalizationService,
    RateLimiterService,
    EmailTrackingService,
    BounceDetectionService,
    ReplyDetectionService,
    ScheduledTasksService,
    TokenRefreshService,
    CircuitBreakerService,
    SchedulerHealthService,
    DetectionCacheService,
    AccountPriorityService,
    PlanLimitValidationService,
    SelectionSessionSchedulerService,
    QuotaManagementService,
    AuditLogMiddleware,
    {
      provide: APP_INTERCEPTOR,
      useClass: UserContextInterceptor,
    },
  ],
  exports: [
    UserContextService,
    CryptoUtilityService,
    TransactionManager,
    RedisProgressService,
    GmailService,
    EmailPersonalizationService,
    RateLimiterService,
    EmailTrackingService,
    BounceDetectionService,
    ReplyDetectionService,
    ScheduledTasksService,
    TokenRefreshService,
    CircuitBreakerService,
    SchedulerHealthService,
    DetectionCacheService,
    AccountPriorityService,
    PlanLimitValidationService,
    SelectionSessionSchedulerService,
    QuotaManagementService,
    AuditLogMiddleware,
  ],
})
export class CommonModule {}
