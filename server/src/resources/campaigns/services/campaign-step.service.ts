import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Campaign } from '../entities/campaign.entity';
import { CampaignStep } from '../entities/campaign-step.entity';
import { CreateStepDto } from '../dto/create-step.dto';
import { UpdateStepDto } from '../dto/update-step.dto';
import { ReorderStepsDto } from '../dto/reorder-steps.dto';
import { Sequelize } from 'sequelize-typescript';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Transaction } from 'sequelize';
import { CampaignsRepository } from '../campaigns.repository';
import { CampaignValidationService } from './campaign-validation.service';
import { CampaignProcessorQueue } from 'src/configuration/bull/queues/campaign-processor.queue';
import { ContactListMember } from 'src/resources/contact-lists/entities/contact-list-member.entity';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import {
  EmailMessage,
  EmailMessageStatus,
} from '../entities/email-message.entity';
import {
  EmailTrackingEvent,
  EmailEventType,
} from '../entities/email-tracking-event.entity';
import { ICampaignStepService } from '../interfaces/campaign-step.interface';
import { RateLimiterService } from 'src/common/services/rate-limiter.service';
import { convertToUtc } from 'src/common/utils/timezone-conversion.util';
import { QuotaManagementService } from 'src/common/services/quota-management.service';
import { CampaignsService } from '../campaigns.service';
import { CampaignSchedulingService } from './campaign-scheduling.service';
import { CampaignContactService } from './campaign-contact.service';
import { CampaignQuotaService } from './campaign-quota.service';
import { CampaignStepQueueService } from './campaign-step-queue.service';
import { EMAIL_STATUS_GROUPS } from '../constants/campaign.constants';

@Injectable()
export class CampaignStepService implements ICampaignStepService {
  private readonly logger = new Logger(CampaignStepService.name);

  constructor(
    private readonly campaignsRepository: CampaignsRepository,
    private readonly sequelize: Sequelize,
    @InjectModel(CampaignStep)
    private readonly campaignStepModel: typeof CampaignStep,
    @InjectModel(ContactListMember)
    private readonly contactListMemberModel: typeof ContactListMember,
    @InjectModel(Contact)
    private readonly contactModel: typeof Contact,
    @InjectModel(EmailMessage)
    private readonly emailMessageModel: typeof EmailMessage,
    @InjectModel(EmailTrackingEvent)
    private readonly emailTrackingEventModel: typeof EmailTrackingEvent,
    private readonly validationService: CampaignValidationService,
    private readonly campaignProcessorQueue: CampaignProcessorQueue,
    private readonly rateLimiterService: RateLimiterService,
    private readonly quotaManagementService: QuotaManagementService,
    private readonly campaignsService: CampaignsService,
    private readonly campaignSchedulingService: CampaignSchedulingService,
    private readonly campaignContactService: CampaignContactService,
    private readonly campaignQuotaService: CampaignQuotaService,
    private readonly campaignStepQueueService: CampaignStepQueueService,
  ) {}

  // Adds a new step to a campaign with validation, auto-activates COMPLETED campaigns, and queues steps for active campaigns
  async add(dto: CreateStepDto): Promise<CampaignStep> {
    return this.sequelize.transaction(async (tx) => {
      const campaign = (await this.campaignsRepository.findOne({
        where: { id: dto.campaignId },
      })) as Campaign | null;
      this.logger.log(
        `Adding step to campaign ${dto.campaignId}, current status: ${campaign?.status}`,
      );

      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }

      // Get existing steps to calculate next step order and validate completion
      const steps = await this.campaignStepModel.findAll({
        where: { campaignId: dto.campaignId },
        order: [['stepOrder', 'ASC']],
        transaction: tx,
      });

      // Validate step configuration, relationships, order, and completion
      await this.validationService.validateStepAddition(dto, campaign, steps);

      // Validate step name uniqueness within campaign if name is provided
      if (dto.name) {
        await this.validateStepNameUniqueness(
          dto.campaignId,
          dto.name,
          undefined,
          tx,
        );
      }

      // Validate subscribed contacts exist before creating step (especially for active/completed campaigns)
      let subscribedCount = 0;
      if (campaign.contactListId) {
        // For ACTIVE campaigns, exclude contacts who unsubscribed or bounced in ANY step of this campaign
        if (campaign.status === 'ACTIVE' && steps.length > 0) {
          // Don't exclude any steps (check all steps in campaign)
          // This ensures we exclude contacts who bounced/unsubscribed in any step
          subscribedCount =
            await this.campaignContactService.countSubscribedContactsExcludingCampaignUnsubscribes(
              campaign.contactListId,
              dto.campaignId,
              undefined, // Check all steps in campaign for unsubscribes and bounces
              tx,
            );
          this.logger.log(
            `Contact list ${campaign.contactListId} has ${subscribedCount} subscribed contact(s) ` +
              `(excluding contacts who unsubscribed or bounced in any step of this campaign)`,
          );
        } else {
          // For DRAFT/PAUSED/COMPLETED, use regular count
          subscribedCount = await this.campaignContactService.countSubscribedContacts(
            campaign.contactListId,
            tx,
          );
        }

        if (subscribedCount === 0) {
          throw new BadRequestException(
            `Cannot add step. Contact list has no subscribed contacts. ` +
              `Please add subscribed contacts to the contact list before adding steps to active/completed campaigns.`,
          );
        }

        this.logger.debug(
          `Contact list ${campaign.contactListId} has ${subscribedCount} subscribed contact(s)`,
        );
      } else if (
        campaign.status === 'ACTIVE' ||
        campaign.status === 'COMPLETED'
      ) {
        throw new BadRequestException(
          `Cannot add step to ${campaign.status} campaign without a contact list assigned.`,
        );
      }

      const nextOrder = steps.length + 1;

      // Check quota when adding step to ACTIVE campaign
      if (
        campaign.status === 'ACTIVE' &&
        campaign.contactListId &&
        subscribedCount > 0 &&
        campaign.createdBy
      ) {
        const emailsForNewStep = subscribedCount; // Each step sends to all contacts

        // Calculate how many emails were already scheduled by previous steps
        // This is the starting index for the new step's emails
        const emailsFromPreviousSteps = subscribedCount * steps.length;

        // Use unified quota service to calculate distribution
        const quotaInfo = await this.campaignQuotaService.getQuotaInfo(
          campaign.createdBy,
        );

        // Calculate quota distribution ONLY for the new step's emails using unified scheduling service
        const newStepDistribution =
          await this.campaignSchedulingService.calculateQuotaDistribution(
            campaign.createdBy,
            emailsForNewStep,
            quotaInfo.remaining,
            quotaInfo.dailyLimit,
          );

        // Adjust indices to be global (accounting for previous steps)
        const adjustedDistribution = newStepDistribution.map((dist) => ({
          day: dist.day,
          startIndex: dist.startIndex + emailsFromPreviousSteps,
          endIndex: dist.endIndex + emailsFromPreviousSteps,
          quotaUsed: dist.quotaUsed,
        }));

        // Merge with existing quota distribution (if any)
        const existingDistribution =
          campaign.sequenceSettings?.quotaDistribution || [];
        const mergedDistribution = [
          ...existingDistribution,
          ...adjustedDistribution,
        ];

        // Update campaign with merged quota distribution
        const sequenceSettings = campaign.sequenceSettings || {};
        sequenceSettings.quotaDistribution = mergedDistribution;
        await this.campaignsRepository.update(
          { id: dto.campaignId },
          { sequenceSettings } as any,
          tx,
        );

        if (emailsForNewStep > quotaInfo.remaining) {
          this.logger.warn(
            `⚠️ Adding step to active campaign ${dto.campaignId}: ` +
              `New step requires ${emailsForNewStep} emails but only ${quotaInfo.remaining} quota remaining. ` +
              `Auto-spreading will be applied.`,
          );
        }

        this.logger.log(
          `✅ Updated quota distribution for campaign ${dto.campaignId}: ` +
            `New step: ${adjustedDistribution.length} days, ${emailsForNewStep} emails ` +
            `(global indices: ${emailsFromPreviousSteps} to ${emailsFromPreviousSteps + emailsForNewStep - 1})`,
        );
      }

      // Convert scheduleTime from step timezone to UTC using Luxon
      let stepData: any = { ...dto, stepOrder: nextOrder };
      
      if (dto.triggerType === 'SCHEDULE' && dto.scheduleTime && dto.timezone) {
        try {
          // scheduleTime is in format "YYYY-MM-DDTHH:mm:ss" (no timezone)
          // Interpret it in the step's timezone and convert to UTC using Luxon
          const utcScheduleTime = convertToUtc(dto.scheduleTime, dto.timezone);
          stepData.scheduleTime = utcScheduleTime;
          this.logger.log(
            `Converted scheduleTime from ${dto.timezone}: ${dto.scheduleTime} → UTC: ${utcScheduleTime.toISOString()}`
          );
        } catch (error) {
          this.logger.error(`Failed to convert scheduleTime: ${error}`);
          throw new BadRequestException(
            `Invalid schedule time or timezone: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      const created = await this.campaignStepModel.create(stepData as any, {
        transaction: tx,
      });
      this.logger.log(`Created step ${created.id} with order ${nextOrder}`);

      // Determine campaign state changes based on current status
      const updateData: any = { totalSteps: nextOrder };
      let shouldAutoActivate = false;
      let shouldQueueNewStep = false;

      // Handle state transitions: COMPLETED campaigns reactivate, ACTIVE campaigns queue new step
      switch (campaign.status) {
        case 'COMPLETED':
          this.logger.log(
            `Campaign was COMPLETED, auto-reactivating to continue with new step`,
          );
          updateData.status = 'ACTIVE';
          shouldAutoActivate = false;
          shouldQueueNewStep = true;
          break;

        case 'ACTIVE':
          this.logger.log(
            `Campaign is ACTIVE, will queue new step for immediate processing`,
          );
          shouldQueueNewStep = true;
          break;

        case 'PAUSED':
          this.logger.log(
            `Campaign is PAUSED, step added but will not be scheduled until resumed`,
          );
          break;

        case 'DRAFT':
          this.logger.log(
            `Campaign is DRAFT, step added and ready for activation`,
          );
          break;

        default:
          this.logger.log(`Campaign status: ${campaign.status}, step added`);
      }

      // Update campaign with new step count and status changes
      await this.campaignsRepository.update(
        { id: dto.campaignId },
        updateData,
        tx,
      );
      this.logger.log(
        `Updated campaign ${dto.campaignId} with data:`,
        updateData,
      );

      // After transaction commits, handle step scheduling and state management
      tx.afterCommit(async () => {
        try {
          if (shouldAutoActivate) {
            this.logger.log(
              `Auto-activating campaign ${dto.campaignId} after adding step`,
            );
            await this.campaignProcessorQueue.addCampaignJob(
              dto.campaignId,
              campaign.organizationId,
              'user',
              campaign.name,
            );
          } else if (shouldQueueNewStep) {
            this.logger.log(
              `Queuing new step ${created.id} for active campaign ${dto.campaignId}`,
            );
            try {
              await this.campaignStepQueueService.queueStep(
                created,
                campaign,
              );
            } catch (stepError) {
              if (stepError instanceof BadRequestException) {
                throw stepError;
              }
              this.logger.error(
                `Failed to process new step ${created.id}:`,
                stepError instanceof Error ? stepError.stack : stepError,
              );
            }
          }

          // Check for scheduling conflicts with existing steps
          await this.handleStepSchedulingConflicts(dto.campaignId, created);

          // Manage campaign state based on step addition
          await this.manageStateForStepAddition(campaign, created);

          // Recalculate campaign totals and ensure data integrity
          await this.ensureCampaignIntegrity(dto.campaignId);
        } catch (error) {
          if (error instanceof BadRequestException) {
            this.logger.warn(
              `Validation failed for step addition: ${error.message}`,
            );
            throw error;
          }

          this.logger.error(
            `Failed to auto-schedule step for campaign ${dto.campaignId}:`,
            error instanceof Error ? error.stack : error,
          );
        }
      });

      this.logger.log(
        `Step ${created.id} successfully added to campaign ${dto.campaignId}`,
      );
      return created;
    });
  }

  // Updates a step with validation of replyToStepId and replyType relationship
  async update(
    stepId: string,
    dto: UpdateStepDto,
  ): Promise<CampaignStep | null> {
    // Load step to get campaign ID
    const existingStep = (await this.campaignStepModel.findByPk(
      stepId,
    )) as CampaignStep | null;
    if (!existingStep) {
      throw new NotFoundException(`Step ${stepId} not found`);
    }

    // Load campaign to check status
    const campaign = (await this.campaignsRepository.findById(
      existingStep.campaignId,
    )) as Campaign | null;
    if (!campaign) {
      throw new NotFoundException(
        `Campaign ${existingStep.campaignId} not found`,
      );
    }

    // Prevent editing steps when campaign is ACTIVE (unless it's a scheduled step that hasn't been processed)
    if (campaign.status === 'ACTIVE') {
      // Check if step has emails in process (QUEUED or SENDING)
      const emailsInProcess = await this.emailMessageModel.count({
        where: {
          campaignId: campaign.id,
          campaignStepId: stepId,
          status: {
            [Op.in]: EMAIL_STATUS_GROUPS.CANCELLABLE,
          },
        },
      });

      if (emailsInProcess > 0) {
        throw new BadRequestException(
          `Cannot edit step. Campaign is ACTIVE and step has ${emailsInProcess} email(s) currently in process (queued or sending). ` +
            `Please pause the campaign first to edit steps.`,
        );
      }

      // Also check if step has any emails at all (even if completed) - this indicates it was processed
      const totalEmails = await this.emailMessageModel.count({
        where: {
          campaignId: campaign.id,
          campaignStepId: stepId,
        },
      });

      // Block if step has emails (already processed)
      if (totalEmails > 0) {
        throw new BadRequestException(
          `Cannot edit step. Campaign is ACTIVE and step has ${totalEmails} email(s) associated with it. ` +
            `Please pause the campaign first to edit steps.`,
        );
      }
    }

    const stepData: any = { ...dto };

    // Validate replyToStepId and replyType are provided together
    if (stepData.replyToStepId && !stepData.replyType) {
      if (!existingStep.replyType) {
        throw new BadRequestException(
          'When replying to a previous step, replyType is required (OPENED or CLICKED)',
        );
      }
    }

    if (stepData.replyType && !stepData.replyToStepId) {
      if (!existingStep.replyToStepId) {
        throw new BadRequestException(
          'replyType requires a replyToStepId (step to reply to)',
        );
      }
    }

    // Validate step name uniqueness if name is being updated
    if (stepData.name) {
      await this.validateStepNameUniqueness(
        existingStep.campaignId,
        stepData.name,
        stepId,
      );
    }

    // Validate scheduleTime against subscription if it's being set/changed
    if (stepData.triggerType === 'SCHEDULE' && stepData.scheduleTime) {
      let scheduleTime: Date;
      try {
        scheduleTime = new Date(stepData.scheduleTime);
        if (isNaN(scheduleTime.getTime())) {
          throw new BadRequestException(
            'Invalid schedule time format. Expected ISO 8601 date string.',
          );
        }
        // Validate against subscription end date + 3 days
        await this.validationService.validateScheduleTimeAgainstSubscription(
          campaign.organizationId,
          scheduleTime,
        );
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException('Invalid schedule time format');
      }
    }

    // Check if this is a scheduled step and scheduleTime/triggerType is being changed
    const isScheduledStep = existingStep.triggerType === 'SCHEDULE';
    const scheduleTimeChanged =
      stepData.scheduleTime !== undefined &&
      stepData.scheduleTime !== existingStep.scheduleTime;
    const triggerTypeChanged =
      stepData.triggerType !== undefined &&
      stepData.triggerType !== existingStep.triggerType;

    // If scheduled step is being updated and campaign is ACTIVE, update/cancel the job
    if (
      campaign.status === 'ACTIVE' &&
      (isScheduledStep || stepData.triggerType === 'SCHEDULE')
    ) {
      if (scheduleTimeChanged || triggerTypeChanged) {
        // Cancel existing job for this step
        const jobCancelled = await this.campaignProcessorQueue.cancelStepJob(
          campaign.id,
          stepId,
        );

        if (jobCancelled) {
          this.logger.log(
            `Cancelled existing job for step ${stepId} due to schedule time or trigger type change`,
          );
        }

        // If step is still SCHEDULE type after update, create new job with new schedule
        const newTriggerType = stepData.triggerType ?? existingStep.triggerType;
        let newScheduleTime =
          stepData.scheduleTime !== undefined
            ? stepData.scheduleTime
            : existingStep.scheduleTime;

        // Convert scheduleTime from step timezone to UTC if provided
        if (newTriggerType === 'SCHEDULE' && newScheduleTime && stepData.timezone) {
          try {
            // If scheduleTime is a string (not already a Date), convert it using Luxon
            if (typeof newScheduleTime === 'string' && !newScheduleTime.includes('Z') && !newScheduleTime.includes('+')) {
              // It's in format "YYYY-MM-DDTHH:mm:ss" - convert from timezone to UTC
              const utcScheduleTime = convertToUtc(newScheduleTime, stepData.timezone);
              newScheduleTime = utcScheduleTime;
              stepData.scheduleTime = utcScheduleTime;
              this.logger.log(
                `✅ Converted scheduleTime from ${stepData.timezone}: ${newScheduleTime} → UTC: ${utcScheduleTime.toISOString()}`
              );
            }
          } catch (error) {
            this.logger.error(`❌ Failed to convert scheduleTime: ${error}`);
            throw new BadRequestException(
              `Invalid schedule time or timezone: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        if (newTriggerType === 'SCHEDULE' && newScheduleTime) {
          const scheduleTime = newScheduleTime instanceof Date ? newScheduleTime : new Date(newScheduleTime);
          const now = new Date();

          // Calculate delay for new schedule
          let delayMs: number | undefined;
          if (scheduleTime > now) {
            delayMs = scheduleTime.getTime() - now.getTime();
            this.logger.log(
              `Step ${stepId} schedule updated. Creating new job with delay: ${Math.round(delayMs / 1000 / 60)} minutes`,
            );
          } else {
            this.logger.log(
              `Step ${stepId} schedule updated to past time. Will process immediately.`,
            );
          }

          // Queue new job with updated schedule using unified service
          const updatedStep = { ...existingStep, triggerType: newTriggerType, scheduleTime: newScheduleTime } as CampaignStep;
          await this.campaignStepQueueService.queueStep(
            updatedStep,
            campaign,
            delayMs,
          );
        } else if (newTriggerType === 'IMMEDIATE') {
          // If changed to IMMEDIATE, queue immediately
          const updatedStep = { ...existingStep, triggerType: newTriggerType } as CampaignStep;
          await this.campaignStepQueueService.queueStep(
            updatedStep,
            campaign,
          );
        }
      }
    }

    await this.campaignStepModel.update(stepData as any, {
      where: { id: stepId },
    });
    const result = await this.campaignStepModel.findByPk(stepId);
    return result ? (result as CampaignStep) : null;
  }

  // Validates that a step can be deleted by checking if it has emails that have been sent
  // Allows deletion if step hasn't started (no emails or only QUEUED emails)
  private async validateStepCanBeDeleted(
    campaignId: string,
    stepId: string,
  ): Promise<void> {
    // Fetch the campaign to check its status
    const campaign = (await this.campaignsRepository.findById(
      campaignId,
    )) as Campaign | null;
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    // Fetch the step to verify it exists
    const step = (await this.campaignStepModel.findByPk(
      stepId,
    )) as CampaignStep | null;
    if (!step) {
      throw new NotFoundException(`Step ${stepId} not found`);
    }

    // Count total emails for this step
    const totalEmails = await this.emailMessageModel.count({
      where: {
        campaignId,
        campaignStepId: stepId,
      },
    });

    // If step has no emails, it hasn't started - allow deletion
    if (totalEmails === 0) {
      this.logger.log(
        `Step ${stepId} has no emails, allowing deletion (step hasn't started)`,
      );
      return;
    }

    // If step has emails, check if any have been sent (SENT, DELIVERED, BOUNCED, FAILED)
    // Only block deletion if emails have been sent (step has started sending)
    const emailsSent = await this.emailMessageModel.count({
      where: {
        campaignId,
        campaignStepId: stepId,
        status: {
          [Op.in]: EMAIL_STATUS_GROUPS.FINAL, // SENT, DELIVERED, BOUNCED, FAILED
        },
      },
    });

    if (emailsSent > 0) {
      // Step has started sending emails - block deletion
      throw new BadRequestException(
        `Cannot delete step. It has ${emailsSent} email(s) that have been sent (SENT, DELIVERED, BOUNCED, or FAILED). ` +
          `Steps that have started sending emails cannot be deleted. ` +
          `Please pause or complete the campaign first.`,
      );
    }

    // Step has emails but none have been sent yet (only QUEUED or SENDING)
    // Allow deletion - these can be cancelled
    this.logger.log(
      `Step ${stepId} has ${totalEmails} email(s) but none have been sent yet. ` +
        `Allowing deletion (emails will be cancelled).`,
    );
  }

  // Deletes a step and reorders remaining steps to maintain sequential order (1, 2, 3...)
  async delete(
    campaignId: string,
    stepId: string,
  ): Promise<{ success: boolean; message: string }> {
    // Validate that the step can be deleted (not in process)
    await this.validateStepCanBeDeleted(campaignId, stepId);

    // Load step and campaign to check if we need to cancel job
    const step = (await this.campaignStepModel.findByPk(
      stepId,
    )) as CampaignStep | null;
    if (!step) {
      throw new NotFoundException(`Step ${stepId} not found`);
    }

    const campaign = (await this.campaignsRepository.findById(
      campaignId,
    )) as Campaign | null;
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    // Cancel step job if it exists (for any step type with queued jobs)
    if (campaign.status === 'ACTIVE') {
      const jobCancelled = await this.campaignProcessorQueue.cancelStepJob(
        campaignId,
        stepId,
      );
      if (jobCancelled) {
        this.logger.log(
          `Cancelled step processing job for step ${stepId} (triggerType: ${step.triggerType})`,
        );
      }
    }

    await this.sequelize.transaction(async (tx) => {
      // Delete all email messages for this step (tracking events will cascade delete)
      const deletedEmailsCount = await this.emailMessageModel.destroy({
        where: {
          campaignId,
          campaignStepId: stepId,
        },
        transaction: tx,
      });

      this.logger.log(
        `Deleted ${deletedEmailsCount} email message(s) for step ${stepId}`,
      );

      // Delete the step
      await this.campaignStepModel.destroy({
        where: { id: stepId },
        transaction: tx,
      });

      // Get remaining steps to reorder
      const remaining = await this.campaignStepModel.findAll({
        where: { campaignId },
        order: [['stepOrder', 'ASC']],
        transaction: tx,
      });

      // Reorder remaining steps sequentially (1, 2, 3...)
      for (let i = 0; i < remaining.length; i++) {
        await this.campaignStepModel.update(
          { stepOrder: i + 1 },
          { where: { id: remaining[i].id, campaignId }, transaction: tx },
        );
      }

      // Update campaign totalSteps count
      await this.campaignsRepository.update(
        { id: campaignId },
        { totalSteps: remaining.length },
        tx,
      );

      // If no steps remain, set campaign back to DRAFT status
      if (remaining.length === 0) {
        await this.campaignsRepository.update(
          { id: campaignId },
          { status: 'DRAFT' },
          tx,
        );
      }
    });

    // Recalculate campaign analytics after deletion (outside transaction for better performance)
    await this.recalculateCampaignAnalytics(campaignId);

    this.logger.log(
      `Step ${stepId} deleted successfully from campaign ${campaignId}`,
    );
    return {
      success: true,
      message: 'Step deleted successfully',
    };
  }

  // Recalculates campaign analytics aggregates from remaining email messages and tracking events
  private async recalculateCampaignAnalytics(
    campaignId: string,
  ): Promise<void> {
    try {
      const campaign = (await this.campaignsRepository.findById(
        campaignId,
      )) as Campaign | null;
      if (!campaign) {
        this.logger.warn(
          `Campaign ${campaignId} not found for analytics recalculation`,
        );
        return;
      }

      // Count distinct email messages for each event type (one event per email message)
      const [
        emailsOpened,
        emailsClicked,
        emailsBounced,
        emailsReplied,
        unsubscribes,
      ] = await Promise.all([
        this.emailTrackingEventModel.count({
          where: { eventType: EmailEventType.OPENED },
          include: [
            {
              model: EmailMessage,
              as: 'emailMessage',
              where: { campaignId },
              required: true,
            },
          ],
          distinct: true,
          col: 'email_message_id',
        }),
        this.emailTrackingEventModel.count({
          where: { eventType: EmailEventType.CLICKED },
          include: [
            {
              model: EmailMessage,
              as: 'emailMessage',
              where: { campaignId },
              required: true,
            },
          ],
          distinct: true,
          col: 'email_message_id',
        }),
        this.emailTrackingEventModel.count({
          where: { eventType: EmailEventType.BOUNCED },
          include: [
            {
              model: EmailMessage,
              as: 'emailMessage',
              where: { campaignId },
              required: true,
            },
          ],
          distinct: true,
          col: 'email_message_id',
        }),
        this.emailTrackingEventModel.count({
          where: { eventType: EmailEventType.REPLIED },
          include: [
            {
              model: EmailMessage,
              as: 'emailMessage',
              where: { campaignId },
              required: true,
            },
          ],
          distinct: true,
          col: 'email_message_id',
        }),
        this.emailTrackingEventModel.count({
          where: { eventType: EmailEventType.UNSUBSCRIBED },
          include: [
            {
              model: EmailMessage,
              as: 'emailMessage',
              where: { campaignId },
              required: true,
            },
          ],
          distinct: true,
          col: 'email_message_id',
        }),
      ]);

      // Count email messages by status
      const [emailsSent, emailsDelivered, emailsFailed] = await Promise.all([
        this.emailMessageModel.count({
          where: {
            campaignId,
            status: {
              [Op.in]: [
                EmailMessageStatus.SENT,
                EmailMessageStatus.DELIVERED,
                EmailMessageStatus.SENDING,
              ],
            },
          },
        }),
        this.emailMessageModel.count({
          where: {
            campaignId,
            status: EmailMessageStatus.DELIVERED,
          },
        }),
        this.emailMessageModel.count({
          where: {
            campaignId,
            status: EmailMessageStatus.FAILED,
          },
        }),
      ]);

      // Count unsubscribes from email messages (unsubscribedAt field)
      const unsubscribedCount = await this.emailMessageModel.count({
        where: {
          campaignId,
          unsubscribedAt: { [Op.ne]: null },
        },
      });

      // Update campaign with recalculated aggregates
      await this.campaignsRepository.update({ id: campaignId }, {
        emailsOpened,
        emailsClicked,
        emailsBounced,
        emailsReplied,
        unsubscribes: unsubscribedCount > 0 ? unsubscribedCount : unsubscribes,
        emailsSent,
        emailsDelivered,
        emailsFailed,
      } as any);

      this.logger.log(
        `Recalculated campaign ${campaignId} analytics: ` +
          `Opened: ${emailsOpened}, Clicked: ${emailsClicked}, Bounced: ${emailsBounced}, ` +
          `Replied: ${emailsReplied}, Unsubscribed: ${unsubscribedCount > 0 ? unsubscribedCount : unsubscribes}, ` +
          `Sent: ${emailsSent}, Delivered: ${emailsDelivered}, Failed: ${emailsFailed}`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to recalculate campaign analytics for ${campaignId}: ${err.message}`,
        err.stack,
      );
    }
  }

  // Reorders steps according to provided stepIdOrder array and validates all step IDs exist
  async reorder(
    campaignId: string,
    dto: ReorderStepsDto,
  ): Promise<CampaignStep[]> {
    // Load campaign to check status
    const campaign = (await this.campaignsRepository.findById(
      campaignId,
    )) as Campaign | null;
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    // Prevent reordering steps when campaign is ACTIVE
    if (campaign.status === 'ACTIVE') {
      throw new BadRequestException(
        `Cannot reorder steps. Campaign is ACTIVE. ` +
          `Please pause the campaign first to reorder steps.`,
      );
    }

    // Get all existing steps and validate provided order
    const steps = await this.campaignStepModel.findAll({
      where: { campaignId },
      order: [['stepOrder', 'ASC']],
    });
    // Validate all step IDs in order exist in campaign
    const ids = new Set(steps.map((s) => s.id));
    for (const id of dto.stepIdOrder)
      if (!ids.has(id)) throw new BadRequestException('Invalid stepIdOrder');

    // Update step orders sequentially based on provided order
    return this.sequelize.transaction(async (tx) => {
      for (let i = 0; i < dto.stepIdOrder.length; i++) {
        await this.campaignStepModel.update(
          { stepOrder: i + 1 },
          { where: { id: dto.stepIdOrder[i], campaignId }, transaction: tx },
        );
      }
      const results = await this.campaignStepModel.findAll({
        where: { campaignId },
        order: [['stepOrder', 'ASC']],
        transaction: tx,
      });
      return results as CampaignStep[];
    });
  }

  // Checks for scheduling conflicts with existing steps (steps scheduled within 1 minute of each other)
  private async handleStepSchedulingConflicts(
    campaignId: string,
    newStep: CampaignStep,
  ): Promise<void> {
    // Only check conflicts for scheduled steps
    if (newStep.triggerType !== 'SCHEDULE' || !newStep.scheduleTime) {
      return;
    }

    const existingSteps = (await this.campaignStepModel.findAll({
      where: { campaignId },
      order: [['stepOrder', 'ASC']],
    })) as CampaignStep[];
    const scheduleTime = new Date(newStep.scheduleTime);

    // Find steps scheduled within 1 minute of new step's schedule time
    const conflictingSteps = existingSteps.filter((step) => {
      if (step.triggerType === 'SCHEDULE' && step.scheduleTime) {
        const existingScheduleTime = new Date(step.scheduleTime);
        const timeDiff = Math.abs(
          scheduleTime.getTime() - existingScheduleTime.getTime(),
        );
        return timeDiff < 60000;
      }
      return false;
    });

    if (conflictingSteps.length > 0) {
      this.logger.warn(
        `Schedule time conflict detected for step ${newStep.id} with steps: ${conflictingSteps.map((s) => s.id).join(', ')}`,
      );
    }

    const campaign = (await this.campaignsRepository.findById(
      campaignId,
    )) as Campaign | null;
    if (campaign && campaign.status === 'ACTIVE') {
      const hoursDiff =
        (new Date().getTime() - scheduleTime.getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 24) {
        this.logger.warn(
          `Schedule time is more than 24 hours in the past for active campaign ${campaignId}`,
        );
      }
    }
  }

  /**
   * Calculate quota distribution across days
   * Now uses unified CampaignSchedulingService
   */
  private async calculateQuotaDistribution(
    userId: string,
    totalEmails: number,
    remainingQuotaToday: number,
    dailyLimit: number,
  ): Promise<
    Array<{
      day: number;
      startIndex: number;
      endIndex: number;
      quotaUsed: number;
    }>
  > {
    // Use unified scheduling service for quota distribution
    return this.campaignSchedulingService.calculateQuotaDistribution(
      userId,
      totalEmails,
      remainingQuotaToday,
      dailyLimit,
    );
  }

  // Ensures campaign data integrity by recalculating totalSteps and totalRecipients from actual data
  private async ensureCampaignIntegrity(campaignId: string): Promise<void> {
    try {
      // Recalculate total steps from actual step count
      const steps = (await this.campaignStepModel.findAll({
        where: { campaignId },
        order: [['stepOrder', 'ASC']],
      })) as CampaignStep[];
      const totalSteps = steps.length;

      // Recalculate total recipients from subscribed contacts if contact list exists
      const campaign = (await this.campaignsRepository.findById(
        campaignId,
      )) as Campaign | null;
      if (campaign && campaign.contactListId) {
        const subscribedCount = await this.campaignContactService.countSubscribedContacts(
          campaign.contactListId,
        );

        await this.campaignsRepository.update(
          { id: campaignId },
          { totalRecipients: subscribedCount },
        );
      }

      await this.campaignsRepository.update({ id: campaignId }, { totalSteps });

      this.logger.debug(
        `Campaign integrity ensured for ${campaignId}: ${totalSteps} total steps`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to ensure campaign integrity for ${campaignId}:`,
        error,
      );
    }
  }

  /**
   * Validates that step name is unique within the campaign
   * @private
   */
  private async validateStepNameUniqueness(
    campaignId: string,
    name: string,
    excludeId?: string,
    transaction?: Transaction,
  ): Promise<void> {
    const where: any = {
      campaignId,
      name,
    };

    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    const existing = await this.campaignStepModel.findOne({
      where,
      transaction,
    });

    if (existing) {
      throw new ConflictException(
        `Campaign step with name "${name}" already exists in this campaign`,
      );
    }
  }

  /**
   * Manages campaign state when adding a new step
   * Handles state transitions and queues steps appropriately
   * 
   * Time Complexity: O(1)
   * Space Complexity: O(1)
   */
  private async manageStateForStepAddition(
    campaign: Campaign,
    newStep: CampaignStep,
  ): Promise<void> {
    const currentStatus = campaign.status;
    this.logger.debug(
      `Managing campaign state: ${currentStatus} -> adding step ${newStep.id}`,
    );

    switch (currentStatus) {
      case 'DRAFT':
        this.logger.debug(`Campaign ${campaign.id} remains in DRAFT state`);
        break;

      case 'ACTIVE':
        // Step is already queued in the add() method above
        this.logger.log(
          `Step ${newStep.id} queued for ACTIVE campaign ${campaign.id}`,
        );
        break;

      case 'COMPLETED':
        this.logger.log(`Reactivating COMPLETED campaign ${campaign.id}`);
        await this.campaignsRepository.update(
          { id: campaign.id },
          { status: 'ACTIVE' },
        );

        // Queue step if it's immediate or past-due scheduled
        if (
          newStep.triggerType === 'IMMEDIATE' ||
          (newStep.triggerType === 'SCHEDULE' &&
            newStep.scheduleTime &&
            new Date(newStep.scheduleTime) <= new Date())
        ) {
          await this.campaignStepQueueService.queueStep(newStep, campaign);
        }
        break;

      case 'PAUSED':
        this.logger.log(
          `Campaign ${campaign.id} remains PAUSED, step will be processed on resume`,
        );
        break;

      case 'CANCELLED':
        this.logger.log(
          `Campaign ${campaign.id} is CANCELLED, step added but will not be processed`,
        );
        break;

      default:
        this.logger.warn(`Unknown campaign status: ${currentStatus}`);
        break;
    }
  }
}
