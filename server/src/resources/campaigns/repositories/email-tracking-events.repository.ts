import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { InjectModel } from '@nestjs/sequelize';
import { EmailTrackingEvent, EmailEventType } from '../entities/email-tracking-event.entity';
import { UserContextService } from 'src/common/services/user-context.service';
import { EmailMessage } from '../entities/email-message.entity';

@Injectable()
export class EmailTrackingEventsRepository extends BaseRepository<EmailTrackingEvent> {
  constructor(
    @InjectModel(EmailTrackingEvent) emailTrackingEventModel: typeof EmailTrackingEvent,
    userContextService: UserContextService,
  ) {
    super(emailTrackingEventModel, undefined, userContextService);
  }

  async countByEventType(
    campaignId: string,
    stepId: string | null,
    eventType: EmailEventType,
  ): Promise<number> {
    const includeWhere: any = { campaignId };
    if (stepId) {
      includeWhere.campaignStepId = stepId;
    }

    return this.model.count({
      where: { eventType },
      include: [{
        model: EmailMessage,
        as: 'emailMessage',
        where: includeWhere,
        required: true,
      }],
      distinct: true,
      col: 'email_message_id',
    });
  }
}

