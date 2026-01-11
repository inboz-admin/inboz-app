import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Campaign } from './entities/campaign.entity';
import { CampaignStep } from './entities/campaign-step.entity';
import { EmailMessage } from './entities/email-message.entity';
import { EmailTrackingEvent } from './entities/email-tracking-event.entity';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignsRepository } from './campaigns.repository';
import { EmailMessagesRepository } from './repositories/email-messages.repository';
import { EmailTrackingEventsRepository } from './repositories/email-tracking-events.repository';
import { CampaignProgressService } from './services/campaign-progress.service';
import { CampaignValidationService } from './services/campaign-validation.service';
import { CampaignCrudService } from './services/campaign-crud.service';
import { CampaignStepService } from './services/campaign-step.service';
import { CampaignAnalyticsService } from './services/campaign-analytics.service';
import { CampaignStateMachineService } from './services/campaign-state-machine.service';
import { CampaignSchedulingService } from './services/campaign-scheduling.service';
import { CampaignContactService } from './services/campaign-contact.service';
import { CampaignQuotaService } from './services/campaign-quota.service';
import { CampaignStepQueueService } from './services/campaign-step-queue.service';
import { ContactList } from 'src/resources/contact-lists/entities/contact-list.entity';
import { ContactListMember } from 'src/resources/contact-lists/entities/contact-list-member.entity';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import { EmailTemplate } from 'src/resources/email-templates/entities/email-template.entity';
import { CampaignProcessorQueue } from 'src/configuration/bull/queues/campaign-processor.queue';
import { EmailSenderQueue } from 'src/configuration/bull/queues/email-sender.queue';
import { SubscriptionsModule } from 'src/resources/subscriptions/subscriptions.module';
import { NotificationsModule } from 'src/resources/notifications/notifications.module';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Campaign,
      CampaignStep,
      ContactList,
      ContactListMember,
      Contact,
      EmailTemplate,
      EmailMessage,
      EmailTrackingEvent,
    ]),
    SubscriptionsModule,
    NotificationsModule,
  ],
  controllers: [CampaignsController],
  providers: [
    CampaignsService,
    CampaignsRepository,
    EmailMessagesRepository,
    EmailTrackingEventsRepository,
    CampaignProgressService,
    CampaignValidationService,
    CampaignCrudService,
    CampaignStepService,
    CampaignAnalyticsService,
    CampaignStateMachineService,
    CampaignSchedulingService,
    CampaignContactService,
    CampaignQuotaService,
    CampaignStepQueueService,
    CampaignProcessorQueue,
    EmailSenderQueue,
  ],
  exports: [
    CampaignsService,
    CampaignCrudService,
    CampaignStepService,
    CampaignAnalyticsService,
    CampaignsRepository,
    EmailMessagesRepository,
    EmailTrackingEventsRepository,
    CampaignProgressService,
    CampaignValidationService,
    CampaignStateMachineService,
    CampaignSchedulingService,
    CampaignContactService,
    CampaignQuotaService,
    CampaignStepQueueService,
    CampaignProcessorQueue,
    EmailSenderQueue,
  ],
})
export class CampaignsModule {}
