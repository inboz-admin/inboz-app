import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { CommonModule } from 'src/common/common.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { EmailTrackingEvent } from '../campaigns/entities/email-tracking-event.entity';
import { EmailMessage } from '../campaigns/entities/email-message.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CampaignStep } from '../campaigns/entities/campaign-step.entity';
import { Contact } from '../contacts/entities/contact.entity';

@Module({
  imports: [
    CommonModule,
    SequelizeModule.forFeature([
      EmailTrackingEvent,
      EmailMessage,
      Campaign,
      CampaignStep,
      Contact,
    ]),
  ],
  controllers: [TrackingController],
})
export class TrackingModule {}

