import { CampaignStep } from '../entities/campaign-step.entity';
import { CreateStepDto } from '../dto/create-step.dto';
import { UpdateStepDto } from '../dto/update-step.dto';
import { ReorderStepsDto } from '../dto/reorder-steps.dto';

export interface ICampaignStepService {
  add(dto: CreateStepDto): Promise<CampaignStep>;
  update(stepId: string, dto: UpdateStepDto): Promise<CampaignStep | null>;
  delete(campaignId: string, stepId: string): Promise<{ success: boolean; message: string }>;
  reorder(campaignId: string, dto: ReorderStepsDto): Promise<CampaignStep[]>;
}

