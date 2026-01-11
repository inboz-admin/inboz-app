import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { InjectModel } from '@nestjs/sequelize';
import { Campaign } from './entities/campaign.entity';
import { UserContextService } from 'src/common/services/user-context.service';

@Injectable()
export class CampaignsRepository extends BaseRepository<Campaign> {
  constructor(
    @InjectModel(Campaign) campaignModel: typeof Campaign,
    userContextService: UserContextService,
  ) {
    super(campaignModel, undefined, userContextService);
  }
}



