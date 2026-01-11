import { Campaign } from '../entities/campaign.entity';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { UpdateCampaignDto } from '../dto/update-campaign.dto';

export interface ICampaignCrudService {
  create(dto: CreateCampaignDto): Promise<Campaign>;
  update(id: string, dto: UpdateCampaignDto): Promise<Campaign>;
  delete(id: string): Promise<{ success: boolean; message: string }>;
  getById(id: string): Promise<Campaign>;
  list(query?: any): Promise<any>;
}

