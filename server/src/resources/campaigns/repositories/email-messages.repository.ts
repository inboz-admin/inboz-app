import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { InjectModel } from '@nestjs/sequelize';
import { EmailMessage } from '../entities/email-message.entity';
import { UserContextService } from 'src/common/services/user-context.service';
import { EmailMessageStatus } from '../entities/email-message.entity';
import { Op, WhereOptions } from 'sequelize';

@Injectable()
export class EmailMessagesRepository extends BaseRepository<EmailMessage> {
  constructor(
    @InjectModel(EmailMessage) emailMessageModel: typeof EmailMessage,
    userContextService: UserContextService,
  ) {
    super(emailMessageModel, undefined, userContextService);
  }

  async countByStatus(
    campaignId: string,
    stepId: string | null,
    statuses: EmailMessageStatus[],
  ): Promise<number> {
    const where: WhereOptions<EmailMessage> = { campaignId };
    if (stepId) {
      where.campaignStepId = stepId;
    }
    if (statuses.length === 1) {
      where.status = statuses[0];
    } else {
      where.status = { [Op.in]: statuses };
    }
    return this.model.count({ where });
  }

  async countAll(campaignId: string, stepId?: string | null): Promise<number> {
    const where: WhereOptions<EmailMessage> = { campaignId };
    if (stepId) {
      where.campaignStepId = stepId;
    }
    return this.model.count({ where });
  }
}

