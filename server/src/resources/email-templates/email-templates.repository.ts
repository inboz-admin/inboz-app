import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { InjectModel } from '@nestjs/sequelize';
import { EmailTemplate } from './entities/email-template.entity';
import { UserContextService } from 'src/common/services/user-context.service';

@Injectable()
export class EmailTemplateRepository extends BaseRepository<EmailTemplate> {
  constructor(
    @InjectModel(EmailTemplate)
    emailTemplateModel: typeof EmailTemplate,
    userContextService: UserContextService,
  ) {
    super(emailTemplateModel, undefined, userContextService);
  }
}
