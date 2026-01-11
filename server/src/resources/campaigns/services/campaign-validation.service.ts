import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CreateStepDto } from '../dto/create-step.dto';
import { Campaign } from '../entities/campaign.entity';
import { InjectModel } from '@nestjs/sequelize';
import { EmailTemplate } from 'src/resources/email-templates/entities/email-template.entity';
import { CampaignStep } from '../entities/campaign-step.entity';
import { CampaignProgressService } from './campaign-progress.service';
import { EmailMessage } from '../entities/email-message.entity';
import { SubscriptionsService } from 'src/resources/subscriptions/subscriptions.service';
import { Op } from 'sequelize';
import { convertToUtc } from 'src/common/utils/timezone-conversion.util';

@Injectable()
export class CampaignValidationService {
  private readonly logger = new Logger(CampaignValidationService.name);

  constructor(
    @InjectModel(EmailTemplate)
    private readonly emailTemplateModel: typeof EmailTemplate,
    @InjectModel(CampaignStep)
    private readonly campaignStepModel: typeof CampaignStep,
    @InjectModel(EmailMessage)
    private readonly emailMessageModel: typeof EmailMessage,
    private readonly campaignProgressService: CampaignProgressService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async validateStepAddition(
    dto: CreateStepDto,
    campaign: Campaign,
    existingSteps?: CampaignStep[],
  ): Promise<void> {
    if (dto.replyToStepId && !dto.replyType) {
      throw new BadRequestException(
        'When replying to a previous step, replyType is required (OPENED or CLICKED)',
      );
    }

    if (dto.replyType && !dto.replyToStepId) {
      throw new BadRequestException(
        'replyType requires a replyToStepId (step to reply to)',
      );
    }

    if (dto.triggerType === 'SCHEDULE') {
      if (!dto.scheduleTime) {
        throw new BadRequestException(
          'Schedule time is required for SCHEDULE trigger type',
        );
      }

      let scheduleTime: Date;
      try {
        // If timezone is provided, convert scheduleTime from that timezone to UTC using Luxon
        if (dto.timezone && dto.scheduleTime) {
          // scheduleTime is in format "YYYY-MM-DDTHH:mm:ss" (no timezone)
          // Interpret it in the step's timezone and convert to UTC
          scheduleTime = convertToUtc(dto.scheduleTime, dto.timezone);
        } else {
          // Fallback: try to parse as-is (for backward compatibility)
          scheduleTime = new Date(dto.scheduleTime);
        }
        
        if (isNaN(scheduleTime.getTime())) {
          throw new BadRequestException(
            'Invalid schedule time format. Expected date/time string in format "YYYY-MM-DDTHH:mm:ss".',
          );
        }
        
        // Check if schedule time is in the past (in UTC)
        if (campaign.status === 'ACTIVE' && scheduleTime < new Date()) {
          throw new BadRequestException(
            'Schedule time cannot be in the past for active campaigns',
          );
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(
          `Invalid schedule time format: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Validate that schedule time doesn't exceed subscription end date + 3 days
      await this.validateScheduleTimeAgainstSubscription(
        campaign.organizationId,
        scheduleTime,
      );
    }

    if (dto.delayMinutes !== undefined && dto.delayMinutes < 0.5) {
      throw new BadRequestException('Delay minutes must be at least 0.5 minutes');
    }

    if (dto.templateId) {
      const template = await this.emailTemplateModel.findByPk(dto.templateId);
      if (!template) {
        throw new NotFoundException(
          `Email template ${dto.templateId} not found`,
        );
      }
      if (template.organizationId !== campaign.organizationId) {
        throw new BadRequestException(
          `Template ${dto.templateId} does not belong to organization ${campaign.organizationId}`,
        );
      }
    }

    // Validate step sequential order and completion
    await this.validateStepOrderAndCompletion(campaign, existingSteps);

    this.logger.debug(`Step validation passed for campaign ${campaign.id}`);
  }

  /**
   * Validates that:
   * 1. All previous steps are completed before adding a new step, OR
   * 2. The last step's last email scheduledSendAt time has passed current time
   * 3. Steps are added sequentially (no gaps in stepOrder)
   */
  async validateStepOrderAndCompletion(
    campaign: Campaign,
    existingSteps?: CampaignStep[],
  ): Promise<void> {
    // For DRAFT campaigns, allow adding steps without completion check
    if (campaign.status === 'DRAFT') {
      this.logger.debug(
        `Campaign ${campaign.id} is DRAFT, skipping step completion validation`,
      );
      return;
    }

    // Load existing steps if not provided
    let steps: CampaignStep[] = existingSteps || [];
    if (!existingSteps) {
      steps = await this.campaignStepModel.findAll({
        where: { campaignId: campaign.id },
        order: [['stepOrder', 'ASC']],
      });
    }

    // If no steps exist, allow adding the first step
    if (steps.length === 0) {
      this.logger.debug(
        `No existing steps for campaign ${campaign.id}, allowing first step`,
      );
      return;
    }

    // Validate sequential order (no gaps)
    const stepOrders = steps.map((s) => s.stepOrder).sort((a, b) => a - b);
    const expectedNextOrder = steps.length + 1;

    // Check for gaps in step order
    for (let i = 0; i < stepOrders.length; i++) {
      const expectedOrder = i + 1;
      if (stepOrders[i] !== expectedOrder) {
        throw new BadRequestException(
          `Cannot add step. Steps must be added sequentially. ` +
            `Expected step order ${expectedOrder}, but found step order ${stepOrders[i]}. ` +
            `Please ensure all steps are added in order without gaps.`,
        );
      }
    }

    // Check if last step's last email scheduledSendAt has passed current time
    const lastStep = steps[steps.length - 1];
    const now = new Date();

    // Find the last email's scheduledSendAt for the last step
    const lastEmail = await this.emailMessageModel.findOne({
      where: {
        campaignId: campaign.id,
        campaignStepId: lastStep.id,
        scheduledSendAt: { [Op.not]: null },
      },
      order: [['scheduledSendAt', 'DESC']],
      attributes: ['scheduledSendAt'],
    });

    // If last email's scheduledSendAt has passed, allow adding step
    if (lastEmail && lastEmail.scheduledSendAt) {
      const lastScheduledTime = new Date(lastEmail.scheduledSendAt);
      if (lastScheduledTime <= now) {
        this.logger.debug(
          `Last step's last email scheduled time (${lastScheduledTime.toISOString()}) has passed current time, allowing new step`,
        );
        return; // Allow adding step
      }
    }

    // If last email check didn't pass, validate all previous steps are completed
    // OPTIMIZATION: Batch progress calculations instead of per-step queries
    // Reduces complexity from O(S² + S×C) to O(S + C) by batching database queries
    const incompleteSteps: CampaignStep[] = [];

    // Batch calculate progress for all steps (reduces N queries to aggregated queries)
    const stepProgressPromises = steps.map((step) =>
      this.campaignProgressService.calculateStepProgress(
        campaign.id,
        step.id,
        step,
      ),
    );
    const progressResults = await Promise.all(stepProgressPromises);

    // Validate completion status for each step
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const progress = progressResults[i];

      // Step is completed if:
      // - progressPercentage >= 100, OR
      // - emailsCompleted >= totalExpected (and totalExpected > 0)
      // - For reply steps with 0 totalExpected, they're considered completed if previous step is completed
      const isCompleted =
        progress.progressPercentage >= 100 ||
        (progress.totalExpected > 0 &&
          progress.emailsCompleted >= progress.totalExpected) ||
        (progress.totalExpected === 0 &&
          step.replyToStepId &&
          progress.progressPercentage >= 100);

      if (!isCompleted) {
        incompleteSteps.push(step);
      }
    }

    if (incompleteSteps.length > 0) {
      const incompleteStepNames = incompleteSteps
        .map((s) => s.name || `Step ${s.stepOrder}`)
        .join(', ');

      throw new BadRequestException(
        `Cannot add new step. All previous steps must be completed first, or the last step's last email scheduled time must have passed. ` +
          `The following step(s) are not yet completed: ${incompleteStepNames}. ` +
          `Please wait for all previous steps to complete or for the last email scheduled time to pass before adding a new step.`,
      );
    }

    this.logger.debug(
      `All ${steps.length} previous step(s) are completed for campaign ${campaign.id}, allowing new step`,
    );
  }

  /**
   * Validates that scheduled time doesn't exceed active subscription end date + 3 days
   */
  async validateScheduleTimeAgainstSubscription(
    organizationId: string,
    scheduleTime: Date,
  ): Promise<void> {
    try {
      const subscription =
        await this.subscriptionsService.findActiveSubscriptionByOrganizationId(
          organizationId,
        );

      if (!subscription) {
        this.logger.warn(
          `No active subscription found for organization ${organizationId}, skipping subscription validation`,
        );
        return; // Allow scheduling if no subscription found (might be trial or free tier)
      }

      if (!subscription.currentPeriodEnd) {
        this.logger.warn(
          `Subscription ${subscription.id} has no currentPeriodEnd, skipping subscription validation`,
        );
        return; // Allow scheduling if no end date
      }

      // Calculate maximum allowed schedule time: subscription end date + 3 days
      const subscriptionEndDate = new Date(subscription.currentPeriodEnd);
      const maxAllowedDate = new Date(subscriptionEndDate);
      maxAllowedDate.setDate(maxAllowedDate.getDate() + 3);

      if (scheduleTime > maxAllowedDate) {
        const formattedScheduleTime = scheduleTime.toISOString().split('T')[0];
        const formattedMaxDate = maxAllowedDate.toISOString().split('T')[0];
        const formattedEndDate = subscriptionEndDate
          .toISOString()
          .split('T')[0];

        throw new BadRequestException(
          `Cannot schedule step. Scheduled time (${formattedScheduleTime}) exceeds the maximum allowed date ` +
            `(${formattedMaxDate}). Your subscription ends on ${formattedEndDate}, and emails can only be scheduled ` +
            `up to 3 days after the subscription end date. Please choose an earlier schedule time or renew your subscription.`,
        );
      }

      this.logger.debug(
        `Schedule time ${scheduleTime.toISOString()} is within subscription period ` +
          `(ends ${subscriptionEndDate.toISOString()}, max allowed ${maxAllowedDate.toISOString()})`,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error validating schedule time against subscription: ${error instanceof Error ? error.message : error}`,
      );
      // Don't block scheduling if there's an error checking subscription
      // This allows the system to continue working even if subscription service has issues
    }
  }

  async validateCampaignActivation(
    campaign: Campaign,
    steps: any[],
    subscribedContactCount: number,
  ): Promise<void> {
    if (!steps || steps.length === 0) {
      throw new BadRequestException(
        'Cannot activate campaign without steps. Please add at least one step.',
      );
    }

    const stepsWithoutTemplates = steps.filter((step) => !step.templateId);
    if (stepsWithoutTemplates.length > 0) {
      throw new BadRequestException(
        `Cannot activate campaign. Steps without templates: ${stepsWithoutTemplates.map((s) => s.id).join(', ')}`,
      );
    }

    if (!campaign.contactListId) {
      throw new BadRequestException(
        'Cannot activate campaign without a contact list',
      );
    }

    if (subscribedContactCount === 0) {
      throw new BadRequestException(
        'Cannot activate campaign. Contact list has no subscribed contacts.',
      );
    }
  }
}
