import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { User } from '../users/entities/user.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { EmailTemplate } from '../email-templates/entities/email-template.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CampaignStep } from '../campaigns/entities/campaign-step.entity';
import { EmailMessage } from '../campaigns/entities/email-message.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { ContactList } from '../contact-lists/entities/contact-list.entity';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    SequelizeModule.forFeature([
      User,
      Contact,
      EmailTemplate,
      Campaign,
      CampaignStep,
      EmailMessage,
      Organization,
      Subscription,
      SubscriptionPlan,
      ContactList,
    ]),
    CommonModule, // For UserContextService
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

