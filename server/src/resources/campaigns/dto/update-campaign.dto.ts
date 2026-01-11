import { PartialType } from '@nestjs/mapped-types';
import { CreateCampaignDto } from './create-campaign.dto';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {
  @IsOptional()
  @IsEnum(['DRAFT', 'ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED'] as const)
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';
}


