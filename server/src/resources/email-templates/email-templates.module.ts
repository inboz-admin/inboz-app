import { Module, Global } from '@nestjs/common';
import { EmailTemplatesService } from './email-templates.service';
import { EmailTemplatesController } from './email-templates.controller';
import { EmailTemplateRepository } from './email-templates.repository';
import { SequelizeModule } from '@nestjs/sequelize';
import { EmailTemplate } from './entities/email-template.entity';
import { SystemTemplate } from './entities/system-template.entity';
import { CampaignStep } from 'src/resources/campaigns/entities/campaign-step.entity';
import { Campaign } from 'src/resources/campaigns/entities/campaign.entity';

@Global()
@Module({
  imports: [
    SequelizeModule.forFeature([EmailTemplate, SystemTemplate, CampaignStep, Campaign]),
  ],
  controllers: [EmailTemplatesController],
  providers: [EmailTemplatesService, EmailTemplateRepository],
  exports: [EmailTemplatesService, EmailTemplateRepository],
})
export class EmailTemplatesModule {}
