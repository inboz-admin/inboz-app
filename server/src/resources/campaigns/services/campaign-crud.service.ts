import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Campaign } from '../entities/campaign.entity';
import { CampaignsRepository } from '../campaigns.repository';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { UpdateCampaignDto } from '../dto/update-campaign.dto';
import { Sequelize } from 'sequelize-typescript';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction, Op } from 'sequelize';
import { ContactList } from 'src/resources/contact-lists/entities/contact-list.entity';
import { ContactListMember } from 'src/resources/contact-lists/entities/contact-list-member.entity';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import { CampaignStep } from '../entities/campaign-step.entity';
import { CampaignProgressService } from './campaign-progress.service';
import { User } from 'src/resources/users/entities/user.entity';
import { ICampaignCrudService } from '../interfaces/campaign-crud.interface';
import { UserContextService } from 'src/common/services/user-context.service';
import { UserRole } from 'src/common/enums/roles.enum';
import { WhereOptions } from 'sequelize';
import { CampaignContactService } from './campaign-contact.service';
import { NotificationEventService } from 'src/resources/notifications/services/notification-event.service';
import { Inject, forwardRef } from '@nestjs/common';

@Injectable()
export class CampaignCrudService implements ICampaignCrudService {
  private readonly logger = new Logger(CampaignCrudService.name);

  constructor(
    private readonly campaignsRepository: CampaignsRepository,
    private readonly sequelize: Sequelize,
    @InjectModel(ContactList)
    private readonly contactListModel: typeof ContactList,
    @InjectModel(ContactListMember)
    private readonly contactListMemberModel: typeof ContactListMember,
    @InjectModel(Contact)
    private readonly contactModel: typeof Contact,
    @InjectModel(CampaignStep)
    private readonly campaignStepModel: typeof CampaignStep,
    private readonly progressService: CampaignProgressService,
    private readonly userContextService: UserContextService,
    private readonly campaignContactService: CampaignContactService,
    @Inject(forwardRef(() => NotificationEventService))
    private readonly notificationEventService?: NotificationEventService,
  ) {}

  // Creates a new campaign within a transaction and calculates totalRecipients from subscribed contacts if contact list provided
  async create(dto: CreateCampaignDto): Promise<Campaign> {
    const self = this;
    return this.sequelize.transaction<Campaign>(async (tx) => {
      // Validate name uniqueness within organization
      await self.validateNameUniqueness(
        dto.organizationId,
        dto.name,
        undefined,
        tx,
      );

      const campaign = (await this.campaignsRepository.create(
        dto,
        tx,
      )) as Campaign;

      // If contact list provided, calculate and set totalRecipients from subscribed contacts only
      if (dto.contactListId) {
        const list = await this.contactListModel.findByPk(dto.contactListId, {
          transaction: tx,
        });
        if (list) {
          const subscribedCount = await this.campaignContactService.countSubscribedContacts(
            dto.contactListId,
            tx,
          );

          await this.campaignsRepository.update(
            { id: campaign.id },
            {
              totalSteps: dto.totalSteps !== undefined ? dto.totalSteps : 0,
              totalRecipients: subscribedCount,
            },
            tx,
          );
        }
      } else if (!dto.totalSteps) {
        await this.campaignsRepository.update(
          { id: campaign.id },
          { totalSteps: 0 },
          tx,
        );
      }

      return (await this.campaignsRepository.findById(
        campaign.id,
        tx,
      )) as Campaign;
    });
  }

  // Updates campaign within a transaction, recalculates totalRecipients if contact list changed, and updates totalSteps from actual steps
  async update(id: string, dto: UpdateCampaignDto): Promise<Campaign> {
    const self = this;
    return this.sequelize.transaction<Campaign>(async (tx) => {
      const existing = (await this.campaignsRepository.findById(
        id,
        tx,
      )) as Campaign | null;
      if (!existing) {
        throw new NotFoundException('Campaign not found');
      }

      // Validate name uniqueness if name is being updated
      if (dto.name) {
        await self.validateNameUniqueness(
          existing.organizationId,
          dto.name,
          id,
          tx,
        );
      }

      // Remove totalSteps from update data as it's calculated from actual steps, not set directly
      const { totalSteps, ...updateData } = dto;

      await this.campaignsRepository.update({ id }, updateData, tx);

      // If contact list changed, recalculate totalRecipients from subscribed contacts
      if (dto.contactListId) {
        const list = await this.contactListModel.findByPk(dto.contactListId, {
          transaction: tx,
        });
        if (list) {
          const subscribedCount = await this.campaignContactService.countSubscribedContacts(
            dto.contactListId,
            tx,
          );
          await this.campaignsRepository.update(
            { id },
            { totalRecipients: subscribedCount },
            tx,
          );
        }
      }

      // Recalculate totalSteps from actual step count to keep it accurate
      const steps = await this.campaignStepModel.findAll({
        where: { campaignId: id },
        order: [['stepOrder', 'ASC']],
        transaction: tx,
      });
      await this.campaignsRepository.update(
        { id },
        { totalSteps: steps.length },
        tx,
      );

      return (await this.campaignsRepository.findById(id, tx)) as Campaign;
    });
  }

  // Deletes a campaign but only allows deletion of DRAFT and COMPLETED campaigns
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const campaign = (await this.campaignsRepository.findById(
      id,
    )) as Campaign | null;

    // Validate campaign exists
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Only allow deletion of DRAFT and COMPLETED campaigns
    if (campaign.status !== 'DRAFT' && campaign.status !== 'COMPLETED') {
      throw new BadRequestException({
        message: `Cannot delete a campaign with status ${campaign.status}. Only DRAFT and COMPLETED campaigns can be deleted.`,
        status: campaign.status,
      });
    }

    // Perform soft delete and verify it was successful
    const deletedCount = await this.campaignsRepository.delete({ id });
    if (deletedCount === 0) {
      throw new NotFoundException('Campaign not found or could not be deleted');
    }

    this.logger.log(`Campaign ${id} deleted successfully`);

    return {
      success: true,
      message: 'Campaign deleted successfully',
    };
  }

  // Automatically marks campaign as COMPLETED when progress reaches 100% using optimistic locking to prevent race conditions
  private async markCampaignCompletedIfNeeded(
    campaignId: string,
    percentage: number,
    currentStatus: string,
  ): Promise<boolean> {
    // Only mark as completed if progress is 100% and status is ACTIVE or PAUSED
    if (
      percentage < 100 ||
      (currentStatus !== 'ACTIVE' && currentStatus !== 'PAUSED')
    ) {
      return false;
    }

    try {
      const { Op, literal } = await import('sequelize');
      // Use optimistic locking with version field to prevent concurrent update conflicts
      const [updatedCount] = await (
        this.campaignsRepository as any
      ).model.update(
        {
          status: 'COMPLETED',
          completedAt: new Date(),
          version: literal('version + 1'),
        },
        {
          where: {
            id: campaignId,
            status: { [Op.in]: ['ACTIVE', 'PAUSED'] },
          },
        },
      );

      if (updatedCount > 0) {
        this.logger.log(
          `✅ Campaign ${campaignId} automatically marked as COMPLETED (progress: ${percentage}%)`,
        );
        
        // Send notification for campaign completion
        try {
          const campaign = await this.campaignsRepository.findById(campaignId);
          if (campaign && this.notificationEventService) {
            await this.notificationEventService.notifyCampaignCompleted(campaign as any);
          }
        } catch (error) {
          this.logger.warn(`Failed to send notification for campaign completion ${campaignId}:`, error);
        }
        
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Failed to mark campaign ${campaignId} as completed:`,
        error,
      );
      return false;
    }
  }

  // Gets a single campaign with all steps, calculates progress for each step and campaign, and auto-marks as completed if 100%
  async getById(id: string): Promise<Campaign> {
    const c = await (this.campaignsRepository as any).model.findByPk(id, {
      include: [
        {
          model: CampaignStep,
          required: false,
          separate: true,
          order: [['stepOrder', 'ASC']],
        },
      ],
      raw: false,
    });
    if (!c) throw new NotFoundException('Campaign not found');

    const campaign = c.get({ plain: true }) as any;
    const steps = campaign.steps || [];

    // Calculate and merge progress metrics for each step
    for (const step of steps) {
      const stepProgress = await this.progressService.calculateStepProgress(
        id,
        step.id,
        step as CampaignStep,
      );

      Object.assign(step, stepProgress);

      const stepName = step.name || `Step ${step.stepOrder}`;
      const campaignName = campaign.name || 'Campaign';
      step.displayName = `${campaignName} - ${stepName}`;
    }

    // Calculate and merge campaign-level progress metrics
    const campaignProgress =
      await this.progressService.calculateCampaignProgress(id);

    Object.assign(campaign, campaignProgress);

    // Auto-mark campaign as completed if progress reached 100%
    const wasCompleted = await this.markCampaignCompletedIfNeeded(
      campaign.id,
      campaignProgress.progressPercentage,
      campaign.status,
    );
    if (wasCompleted) {
      campaign.status = 'COMPLETED';
      campaign.completedAt = new Date();
    }

    campaign.steps = steps;
    return campaign;
  }

  // Lists campaigns with optional filters, calculates progress for each, and auto-marks as completed if 100%
  async list(query?: any) {
    const whereConditions: any = {};

    // Don't put organizationId in whereConditions - pass via RepositoryOptions.organizationId
    // so BaseRepository.applyTenantFilter() can handle it properly for employees

    // Apply user role-based filtering (similar to templates)
    const currentUser = this.userContextService.getCurrentUser();
    const userId = currentUser?.sub;
    const userRole = currentUser?.role as UserRole;
    const isEmployee = currentUser?.type === 'employee';
    // For employees, treat them as admins (can see all data in selected organization)
    const isAdmin = isEmployee || userRole === UserRole.ADMIN;

    // Regular users should only see their own campaigns
    // Employees can see all campaigns in the selected organization
    if (!isAdmin && userId) {
      whereConditions.createdBy = userId;
    }

    // Apply status filter if provided
    if (query?.status) {
      whereConditions.status = query.status;
    }

    const result = await this.campaignsRepository.findAll({
      where: whereConditions,
      organizationId: query?.organizationId, // Pass via RepositoryOptions for employee filtering
      pagination: {
        page: query?.page || 1,
        limit: query?.limit || 10,
        searchTerm: query?.search || query?.searchTerm || '',
        searchFields: ['name', 'description'],
        sortBy: query?.sortBy || 'createdAt',
        sortOrder: query?.sortOrder || 'DESC',
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false,
        },
      ],
    } as any);

    const campaigns =
      result?.data && Array.isArray(result.data)
        ? (result.data as Campaign[])
        : Array.isArray(result)
          ? (result as Campaign[])
          : [];

    // Calculate progress and auto-complete for each campaign in the list
    for (const campaign of campaigns) {
      const campaignProgress =
        await this.progressService.calculateCampaignProgress(campaign.id);

      Object.assign(campaign, campaignProgress);

      const wasCompleted = await this.markCampaignCompletedIfNeeded(
        campaign.id,
        campaignProgress.progressPercentage,
        campaign.status,
      );
      if (wasCompleted) {
        campaign.status = 'COMPLETED';
        campaign.completedAt = new Date();
      }
    }

    return result;
  }

  /**
   * Validates that campaign name is unique within the organization
   * @private
   */
  private async validateNameUniqueness(
    organizationId: string,
    name: string,
    excludeId?: string,
    transaction?: Transaction,
  ): Promise<void> {
    const where: WhereOptions<Campaign> = {
      organizationId,
      name,
    };

    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    const existing = await this.campaignsRepository.findOne({
      where,
      transaction,
    });

    if (existing) {
      throw new ConflictException(
        `Campaign with name "${name}" already exists in this organization`,
      );
    }
  }
}
