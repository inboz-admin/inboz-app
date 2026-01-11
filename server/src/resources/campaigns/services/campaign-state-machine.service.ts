import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Campaign } from '../entities/campaign.entity';

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

@Injectable()
export class CampaignStateMachineService {
  private readonly logger = new Logger(CampaignStateMachineService.name);

  private readonly validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
    DRAFT: ['ACTIVE', 'CANCELLED'],
    ACTIVE: ['PAUSED', 'COMPLETED', 'CANCELLED'],
    PAUSED: ['ACTIVE', 'CANCELLED'],
    COMPLETED: ['ACTIVE'],
    CANCELLED: [],
  };

  canTransition(from: CampaignStatus, to: CampaignStatus): boolean {
    const allowedTransitions = this.validTransitions[from];
    return allowedTransitions.includes(to);
  }

  validateTransition(
    currentStatus: CampaignStatus,
    newStatus: CampaignStatus,
    campaign?: Campaign,
  ): void {
    if (currentStatus === newStatus) {
      this.logger.debug(`Campaign already in ${currentStatus} state`);
      return;
    }

    if (!this.canTransition(currentStatus, newStatus)) {
      throw new BadRequestException(
        `Invalid state transition from ${currentStatus} to ${newStatus}. ` +
        `Allowed transitions from ${currentStatus}: ${this.validTransitions[currentStatus].join(', ')}`
      );
    }

    if (newStatus === 'ACTIVE' && campaign) {
      this.validateActivation(campaign);
    }

    if (newStatus === 'COMPLETED' && currentStatus !== 'ACTIVE' && currentStatus !== 'PAUSED') {
      throw new BadRequestException(
        `Cannot mark campaign as COMPLETED from ${currentStatus} state. ` +
        `Only ACTIVE or PAUSED campaigns can be completed.`
      );
    }

    this.logger.log(`Valid transition: ${currentStatus} -> ${newStatus}`);
  }

  getNextValidStates(currentStatus: CampaignStatus): CampaignStatus[] {
    return this.validTransitions[currentStatus];
  }

  private validateActivation(campaign: Campaign): void {
    if (!campaign.contactListId) {
      throw new BadRequestException('Cannot activate campaign without a contact list');
    }

    if (campaign.totalSteps === 0) {
      throw new BadRequestException('Cannot activate campaign without steps');
    }
  }

  getTransitionDescription(from: CampaignStatus, to: CampaignStatus): string {
    const descriptions: Record<string, string> = {
      'DRAFT->ACTIVE': 'Activate campaign',
      'DRAFT->CANCELLED': 'Cancel draft campaign',
      'ACTIVE->PAUSED': 'Pause active campaign',
      'ACTIVE->COMPLETED': 'Mark campaign as completed',
      'ACTIVE->CANCELLED': 'Cancel active campaign',
      'PAUSED->ACTIVE': 'Resume paused campaign',
      'PAUSED->CANCELLED': 'Cancel paused campaign',
      'COMPLETED->ACTIVE': 'Reactivate completed campaign (by adding steps)',
    };

    return descriptions[`${from}->${to}`] || `Transition from ${from} to ${to}`;
  }
}

