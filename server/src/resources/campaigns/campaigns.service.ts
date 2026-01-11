import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BaseService } from 'src/common/services/base.service';
import { Campaign } from './entities/campaign.entity';
import { CampaignsRepository } from './campaigns.repository';
import { CampaignStep } from './entities/campaign-step.entity';
import {
  EmailMessage,
  EmailMessageStatus,
} from './entities/email-message.entity';
import { Sequelize } from 'sequelize-typescript';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize as SequelizeType, Transaction } from 'sequelize';
import { ContactList } from 'src/resources/contact-lists/entities/contact-list.entity';
import { ContactListMember } from 'src/resources/contact-lists/entities/contact-list-member.entity';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import { CampaignProcessorQueue } from 'src/configuration/bull/queues/campaign-processor.queue';
import { EmailSenderQueue } from 'src/configuration/bull/queues/email-sender.queue';
import { RateLimiterService } from 'src/common/services/rate-limiter.service';
import { QuotaManagementService } from 'src/common/services/quota-management.service';
import { getMidnightInTimezone } from 'src/common/utils/timezone.util';
import { CampaignSchedulingService } from './services/campaign-scheduling.service';
import { CampaignContactService } from './services/campaign-contact.service';
import { CampaignQuotaService } from './services/campaign-quota.service';
import { CampaignStepQueueService } from './services/campaign-step-queue.service';
import { CampaignStateMachineService } from './services/campaign-state-machine.service';
import { EMAIL_STATUS_GROUPS, BATCH_SIZE_RESUME, MAX_SCHEDULE_DAYS } from './constants/campaign.constants';
import { NotificationEventService } from 'src/resources/notifications/services/notification-event.service';
import { Inject, forwardRef } from '@nestjs/common';

@Injectable()
export class CampaignsService extends BaseService<Campaign> {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly campaignsRepository: CampaignsRepository,
    private readonly sequelize: Sequelize,
    @InjectModel(ContactList)
    private readonly contactListModel: typeof ContactList,
    @InjectModel(ContactListMember)
    private readonly contactListMemberModel: typeof ContactListMember,
    @InjectModel(Contact)
    private readonly contactModel: typeof Contact,
    @InjectModel(EmailMessage)
    private readonly emailMessageModel: typeof EmailMessage,
    @InjectModel(CampaignStep)
    private readonly campaignStepModel: typeof CampaignStep,
    private readonly campaignProcessorQueue: CampaignProcessorQueue,
    private readonly emailSenderQueue: EmailSenderQueue,
    private readonly rateLimiterService: RateLimiterService,
    private readonly quotaManagementService: QuotaManagementService,
    private readonly campaignSchedulingService: CampaignSchedulingService,
    private readonly campaignContactService: CampaignContactService,
    private readonly campaignQuotaService: CampaignQuotaService,
    private readonly campaignStepQueueService: CampaignStepQueueService,
    private readonly stateMachineService: CampaignStateMachineService,
    @Inject(forwardRef(() => NotificationEventService))
    private readonly notificationEventService?: NotificationEventService,
  ) {
    super(campaignsRepository as any);
  }

  // OLD METHOD - REMOVED: calculateQuotaDistribution
  // This method has been replaced by CampaignSchedulingService.calculateQuotaDistribution
  // which provides unified quota distribution logic for all scenarios.

  /**
   * Find the last scheduled email day across all previous steps (steps with stepOrder < currentStepOrder)
   * Returns the day offset (0 = today, 1 = tomorrow, etc.) of the last scheduled email, or -1 if none found
   */
  private async findLastScheduledEmailDay(
    campaignId: string,
    currentStepOrder: number,
  ): Promise<number> {
    // Find all steps with stepOrder < currentStepOrder
    const previousSteps = await this.campaignStepModel.findAll({
      where: {
        campaignId,
        stepOrder: {
          [Op.lt]: currentStepOrder,
        },
      },
      attributes: ['id', 'stepOrder'],
    });

    this.logger.debug(
      `🔍 Finding last scheduled email day for step ${currentStepOrder}: ` +
        `Found ${previousSteps.length} previous step(s): ${previousSteps.map((s) => `Step ${s.stepOrder} (${s.id})`).join(', ')}`,
    );

    if (previousSteps.length === 0) {
      // No previous steps, start from day 0 (today)
      this.logger.debug(
        `No previous steps found for step ${currentStepOrder}, returning -1`,
      );
      return -1;
    }

    const previousStepIds = previousSteps.map((s) => s.id);

    // Find the latest scheduledSendAt across all emails from previous steps
    const lastScheduledEmail = await this.emailMessageModel.findOne({
      where: {
        campaignId,
        campaignStepId: {
          [Op.in]: previousStepIds,
        },
        scheduledSendAt: {
          [Op.not]: null,
        },
        status: {
          [Op.in]: [EmailMessageStatus.QUEUED, EmailMessageStatus.SENDING],
        },
      },
      order: [['scheduledSendAt', 'DESC']],
      attributes: ['scheduledSendAt', 'campaignStepId'],
    });

    if (!lastScheduledEmail || !lastScheduledEmail.scheduledSendAt) {
      // No scheduled emails from previous steps, start from day 0
      this.logger.debug(
        `No scheduled emails found from previous steps ${previousStepIds.join(', ')} for step ${currentStepOrder}, returning -1`,
      );
      return -1;
    }

    this.logger.debug(
      `Found last scheduled email from previous steps: scheduledSendAt=${lastScheduledEmail.scheduledSendAt?.toISOString()}, ` +
        `campaignStepId=${lastScheduledEmail.campaignStepId}`,
    );

    // Calculate which day offset this scheduledSendAt belongs to
    const scheduledDate = new Date(lastScheduledEmail.scheduledSendAt);

    // Find which day this scheduled date falls on (using UTC for default)
    let day = -1;
    const timezone = 'UTC'; // Default timezone for this helper method
    for (let d = 0; d <= MAX_SCHEDULE_DAYS; d++) {
      const dayStart = getMidnightInTimezone(d, timezone);
      const dayEnd = getMidnightInTimezone(d + 1, timezone);

      if (scheduledDate >= dayStart && scheduledDate < dayEnd) {
        day = d;
        break;
      }
    }

    if (day === -1) {
      this.logger.warn(
        `Could not determine day for scheduledSendAt: ${scheduledDate.toISOString()}`,
      );
      return -1;
    }

    this.logger.debug(
      `📅 Last scheduled email from previous steps: ${scheduledDate.toISOString()} (day ${day}). ` +
        `Next step will start from day ${day + 1} or first available day.`,
    );

    return day;
  }

  // Helper method to get day offset from a date (using UTC for default)
  private getDayFromDate(date: Date, timezone: string = 'UTC'): number {
    // Calculate which day this date falls on
    for (let day = 0; day <= MAX_SCHEDULE_DAYS; day++) {
      const dayStart = getMidnightInTimezone(day, timezone);
      const dayEnd = getMidnightInTimezone(day + 1, timezone);

      if (date >= dayStart && date < dayEnd) {
        return day;
      }
    }

    // Fallback: return 0 if can't determine
    return 0;
  }

  // Activates a campaign by validating prerequisites, updating status to ACTIVE, and queuing all steps for processing
  async activateCampaign(
    campaignId: string,
    quotaMode: 'auto-spread' | 'restrict' = 'auto-spread',
  ): Promise<Campaign> {
    const campaign = (await this.campaignsRepository.findById(
      campaignId,
    )) as Campaign | null;

    this.logger.log(
      `Activating campaign ${campaignId}, current status: ${campaign?.status}`,
    );

    // Validate campaign exists
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    if (campaign.status === 'ACTIVE') {
      throw new BadRequestException('Campaign is already active');
    }

    if (campaign.status === 'COMPLETED') {
      throw new BadRequestException(
        'Cannot activate a completed campaign. Add a new step to continue sending.',
      );
    }

    // Validate campaign has at least one step
    const steps = (await this.campaignStepModel.findAll({
      where: { campaignId },
      order: [['stepOrder', 'ASC']],
    })) as CampaignStep[];
    if (!steps || steps.length === 0) {
      throw new BadRequestException(
        'Cannot activate campaign without steps. Please add at least one step.',
      );
    }

    // Validate all steps have email templates assigned
    const stepsWithoutTemplates = steps.filter((step) => !step.templateId);
    if (stepsWithoutTemplates.length > 0) {
      throw new BadRequestException(
        `Cannot activate campaign. Steps without templates: ${stepsWithoutTemplates.map((s) => s.id).join(', ')}`,
      );
    }

    // Validate contact list exists and is assigned to campaign
    if (!campaign.contactListId) {
      throw new BadRequestException(
        'Cannot activate campaign without a contact list',
      );
    }

    const contactList = await this.contactListModel.findByPk(
      campaign.contactListId,
    );
    if (!contactList) {
      throw new NotFoundException(
        `Contact list ${campaign.contactListId} not found`,
      );
    }

    // Validate contact list has at least one subscribed contact
    const contactCount = await this.campaignContactService.countSubscribedContacts(
      campaign.contactListId,
    );

    if (contactCount === 0) {
      throw new BadRequestException(
        'Cannot activate campaign. Contact list has no subscribed contacts.',
      );
    }

    // Pre-activation quota validation using unified quota service
    const totalEmails = contactCount * steps.length;
    const quotaResult = await this.campaignQuotaService.validateAndCalculateDistribution(
      campaign.createdBy,
      totalEmails,
      quotaMode,
    );

    const quotaDistribution = quotaResult.distribution.length > 0 
      ? quotaResult.distribution 
      : null;

    if (quotaResult.willSpread) {
      if (quotaMode === 'restrict') {
        this.logger.warn(
          `Campaign ${campaignId} will spread across ${quotaResult.daysNeeded} days due to quota limits. ` +
            `Total emails: ${totalEmails}`,
        );
      } else {
        this.logger.log(
          `Campaign ${campaignId} will spread across ${quotaResult.daysNeeded} days due to quota limits. ` +
            `Total emails: ${totalEmails}`,
        );
      }
    }

    // Store quota distribution in campaign sequenceSettings for processor to use
    // Note: Processor will recalculate dynamically, but this gives an estimate
    if (quotaDistribution) {
      const sequenceSettings = campaign.sequenceSettings || {};
      sequenceSettings.quotaDistribution = quotaDistribution;
      await this.campaignsRepository.update(
        { id: campaignId } as any,
        { sequenceSettings } as any,
      );
    }

    // Update campaign status to ACTIVE to allow processing
    this.logger.log(`Updating campaign ${campaignId} status to ACTIVE`);
    
    // Validate state transition
    this.stateMachineService.validateTransition(
      campaign.status as any,
      'ACTIVE',
      campaign,
    );
    
    await this.campaignsRepository.update(
      { id: campaignId } as any,
      { status: 'ACTIVE' } as any,
    );

    // Send notification for campaign started
    try {
      const updatedCampaign = await this.campaignsRepository.findById(campaignId);
      if (updatedCampaign && this.notificationEventService) {
        await this.notificationEventService.notifyCampaignStarted(updatedCampaign as any);
      }
    } catch (error) {
      this.logger.warn(`Failed to send notification for campaign started ${campaignId}:`, error);
    }

    // Process each step based on trigger type using unified step queue service
    const existingEmailsCheck = async (stepId: string): Promise<number> => {
      const existingEmails = await this.emailMessageModel.count({
        where: {
          campaignId,
          campaignStepId: stepId,
        },
      });

      // For scheduled steps, check if step processing is complete
      if (existingEmails > 0) {
        const step = steps.find((s) => s.id === stepId);
        if (step?.triggerType === 'SCHEDULE') {
          const contactCount = await this.campaignContactService.countSubscribedContacts(
          campaign.contactListId,
        );
        if (existingEmails >= contactCount) {
          this.logger.log(
              `Step ${stepId} already has ${existingEmails} emails (${contactCount} contacts), skipping`,
          );
            return existingEmails; // Return high number to skip
          }
        }
      }

      return existingEmails;
    };

    const queueResult = await this.campaignStepQueueService.queueSteps(
      steps,
      campaign,
      existingEmailsCheck,
    );

    const {
      immediateStepsProcessed,
      pastScheduledStepsProcessed,
      futureScheduledStepsDeferred,
    } = queueResult;

    // Log summary of activation results
    this.logger.log(
      `📊 Campaign Activation Summary for ${campaignId}: ` +
        `Immediate steps: ${immediateStepsProcessed}, ` +
        `Past-due scheduled: ${pastScheduledStepsProcessed}, ` +
        `Future scheduled (queued with delays): ${futureScheduledStepsDeferred}, ` +
        `Total steps: ${steps.length}`,
    );

    if (immediateStepsProcessed > 0 || pastScheduledStepsProcessed > 0) {
      this.logger.log(
        `✅ Activated campaign ${campaignId}: ${immediateStepsProcessed} immediate step(s) processed, ` +
          `${pastScheduledStepsProcessed} past-due scheduled step(s) processed`,
      );
    }

    if (futureScheduledStepsDeferred > 0) {
      this.logger.log(
        `📅 ${futureScheduledStepsDeferred} future scheduled step(s) queued with delays. ` +
          `BullMQ will automatically process them at their scheduled times. ` +
          `Check job state in BullMQ dashboard to verify jobs are in 'delayed' state.`,
      );
    }

    // Warn if no steps were queued at all
    if (
      immediateStepsProcessed === 0 &&
      pastScheduledStepsProcessed === 0 &&
      futureScheduledStepsDeferred === 0
    ) {
      this.logger.warn(
        `⚠️ WARNING: No steps were queued for campaign ${campaignId}. ` +
          `All ${steps.length} step(s) may have been skipped (check logs above for reasons).`,
      );
    }

    const updatedCampaign = (await this.campaignsRepository.findById(
      campaignId,
    )) as Campaign;
    this.logger.log(
      `Campaign ${campaignId} activated, new status: ${updatedCampaign.status}`,
    );
    return updatedCampaign;
  }

  // Pauses an active campaign by updating status to PAUSED and cancelling all queued email jobs
  async pauseCampaign(campaignId: string): Promise<Campaign> {
    const campaign = (await this.campaignsRepository.findById(
      campaignId,
    )) as Campaign | null;

    // Validate campaign exists
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    // Validate state transition
    this.stateMachineService.validateTransition(
      campaign.status as any,
      'PAUSED',
      campaign,
    );

    this.logger.log(`Pausing campaign ${campaignId}`);

    // Update status to PAUSED first to prevent new jobs from starting
    await this.campaignsRepository.update(
      { id: campaignId },
      { status: 'PAUSED' },
    );

    // Send notification for campaign paused
    try {
      const updatedCampaign = await this.campaignsRepository.findById(campaignId);
      if (updatedCampaign && this.notificationEventService) {
        await this.notificationEventService.notifyCampaignPaused(updatedCampaign as any);
      }
    } catch (error) {
      this.logger.warn(`Failed to send notification for campaign paused ${campaignId}:`, error);
    }

    // Cancel all processor queue jobs (waiting, delayed, active)
    const processorCancelled =
      await this.campaignProcessorQueue.cancelCampaignJobs(campaignId);

    // Get all queued email message IDs to optimize queue cancellation
    const queuedEmailMessages = await this.emailMessageModel.findAll({
      where: {
        campaignId,
        status: {
          [Op.in]: [EmailMessageStatus.QUEUED, EmailMessageStatus.SENDING],
        },
      },
      attributes: ['id'],
      raw: true,
    });

    const emailMessageIds = queuedEmailMessages.map((em: any) => em.id);

    // Cancel all email sender queue jobs using optimized email message IDs
    const emailCancelled = await this.emailSenderQueue.cancelCampaignEmails(
      campaignId,
      emailMessageIds,
    );

    // Update all non-final email statuses to CANCELLED (QUEUED and SENDING)
    const cancelledEmails = await this.emailMessageModel.update(
      { status: EmailMessageStatus.CANCELLED },
      {
        where: {
          campaignId,
          status: {
            [Op.in]: EMAIL_STATUS_GROUPS.CANCELLABLE,
          },
        },
      },
    );

    this.logger.log(
      `Paused campaign ${campaignId}: ` +
        `Cancelled ${processorCancelled} processor jobs, ` +
        `${emailCancelled} email jobs, ` +
        `${cancelledEmails[0]} email messages`,
    );

    return (await this.campaignsRepository.findById(campaignId)) as Campaign;
  }

  // Resumes a paused campaign by updating status to ACTIVE and re-queuing cancelled emails plus processing incomplete steps
  async resumeCampaign(
    campaignId: string,
    quotaMode: 'auto-spread' | 'restrict' = 'auto-spread',
  ): Promise<Campaign> {
    const campaign = (await this.campaignsRepository.findById(
      campaignId,
    )) as Campaign | null;

    // Validate campaign exists
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    // Validate state transition
    this.stateMachineService.validateTransition(
      campaign.status as any,
      'ACTIVE',
      campaign,
    );

    this.logger.log(`Resuming campaign ${campaignId}`);

    // Validate contact list exists before resuming
    if (!campaign.contactListId) {
      throw new BadRequestException(
        'Cannot resume campaign without a contact list',
      );
    }

    const subscribedCount = await this.campaignContactService.countSubscribedContacts(
      campaign.contactListId,
    );

    if (subscribedCount === 0) {
      throw new BadRequestException(
        'Cannot resume campaign. Contact list has no subscribed contacts.',
      );
    }

    this.logger.debug(
      `Contact list ${campaign.contactListId} has ${subscribedCount} subscribed contact(s)`,
    );

    // Get all campaign steps to calculate remaining emails
    const steps = (await this.campaignStepModel.findAll({
      where: { campaignId },
      order: [['stepOrder', 'ASC']],
    })) as CampaignStep[];

    if (steps.length === 0) {
      throw new BadRequestException('Cannot resume campaign without steps');
    }

    // Check quota for remaining emails (cancelled + incomplete emails)
    // Count cancelled emails that will be re-queued
    const cancelledEmailCount = await this.emailMessageModel.count({
      where: {
        campaignId,
        status: EmailMessageStatus.CANCELLED,
      },
    });

    // Estimate incomplete emails by counting steps that haven't processed all contacts
    let incompleteEmailCount = 0;
    for (const step of steps) {
      const processedEmailCount = await this.emailMessageModel.count({
        where: {
          campaignId,
          campaignStepId: step.id,
          status: {
            [Op.in]: EMAIL_STATUS_GROUPS.COMPLETED.concat([EmailMessageStatus.QUEUED]),
          },
        },
      });
      const remainingEmails = Math.max(
        0,
        subscribedCount - processedEmailCount,
      );
      incompleteEmailCount += remainingEmails;
    }

    const totalRemainingEmails = cancelledEmailCount + incompleteEmailCount;

    // Check quota if there are remaining emails to send
    if (totalRemainingEmails > 0 && campaign.createdBy) {
      await this.campaignQuotaService.validateQuotaForOperation(
        campaign.createdBy,
        totalRemainingEmails,
        quotaMode,
          );
    }

    // Update campaign status to ACTIVE to allow processing
    // State transition already validated above
    await this.campaignsRepository.update(
      { id: campaignId } as any,
      { status: 'ACTIVE' } as any,
    );

    // Reload campaign to get updated sequenceSettings with quota distribution
    const updatedCampaign = (await this.campaignsRepository.findById(
      campaignId,
    )) as Campaign | null;
    if (!updatedCampaign) {
      throw new NotFoundException(
        `Campaign ${campaignId} not found after update`,
      );
    }

    const totalContacts = subscribedCount;

    // Get quota distribution if available (from quota check above)
    const quotaDistribution =
      updatedCampaign.sequenceSettings?.quotaDistribution || null;

    // Load all subscribed contacts to calculate global email index (same as activation)
    const contacts = await this.campaignContactService.getSubscribedContacts(
      campaign.contactListId,
    );

    // Create a map of contactId to index for fast lookup
    const contactIndexMap = this.campaignContactService.createContactIndexMap(contacts);

    // For each step: re-queue cancelled emails and process incomplete steps
    // Process steps in order to preserve step sequence (Step 1 before Step 2, etc.)
    let reQueuedEmails = 0;
    let incompleteStepsQueued = 0;
    const overdueSteps: Array<{
      stepId: string;
      stepName: string;
      scheduleTime: Date;
    }> = [];

    // Track the last scheduled email time for each day as we process steps
    // This ensures Step 2 starts after Step 1's last email on the same day
    const lastScheduledTimeByDay = new Map<number, Date>();

    for (const step of steps) {
      const stepName = step.name || `Step ${step.stepOrder}`;

      // Find all cancelled emails for this step to re-queue them
      const cancelledEmails = await this.emailMessageModel.findAll({
        where: {
          campaignId,
          campaignStepId: step.id,
          status: EmailMessageStatus.CANCELLED,
        },
        order: [['contactId', 'ASC']], // Consistent ordering for quota distribution
      });

      if (cancelledEmails.length > 0) {
        this.logger.log(
          `Re-queuing ${cancelledEmails.length} cancelled email(s) for step ${step.id} (${stepName}) with step-order-aware quota distribution`,
        );

        // Simple rule: Each step always starts from day 0 (today)
        // The quota checking logic will naturally skip full days and fill available quota
        // This ensures:
        // - S1: Day 0 - 25, Day 1 - 5
        // - S2: Day 0 - 0 (full, skipped), Day 1 - 20 (5 already used), Day 2 - 5
        // - S3: Day 0 - 0 (full, skipped), Day 1 - 0 (full, skipped), Day 2 - 20 (5 already used), Day 3 - 10
        const startDay: number | undefined = undefined; // Always start from day 0

        this.logger.debug(
          `Step ${step.stepOrder} (${stepName}): Starting quota distribution from day 0. ` +
            `Quota checking will automatically skip full days and fill available quota.`,
        );

        // SIMPLE RESUME LOGIC:
        // 1. Count how many emails are already sent in THIS step
        // 2. Get remaining quota for each day (accounts for other campaigns/steps)
        // 3. Start scheduling from last sent email time
        // 4. Schedule all remaining emails, but only up to remaining quota for each day
        // 5. Move extra to next day

        // Get timezone from step
        const timezone = step.timezone || 'UTC';

        // Count sent emails in THIS step on day 0 (today)
        const sentEmailsInThisStep = await this.emailMessageModel.count({
          where: {
            campaignId,
            campaignStepId: step.id,
            status: {
              [Op.in]: [EmailMessageStatus.SENT, EmailMessageStatus.DELIVERED],
            },
            scheduledSendAt: {
              [Op.gte]: getMidnightInTimezone(0, timezone), // Today
              [Op.lt]: getMidnightInTimezone(1, timezone), // Before tomorrow
            },
          },
        });

        this.logger.log(
          `Step ${step.stepOrder} (${stepName}): Resume logic - ` +
            `Sent in this step: ${sentEmailsInThisStep}, ` +
            `Cancelled emails to reschedule: ${cancelledEmails.length}`,
        );

        // Calculate quota distribution for cancelled emails using unified service
        // This optimizes from O(S × C × D) to O(C × D) by using batch quota queries
        const quotaInfo = await this.campaignQuotaService.getQuotaInfo(
              campaign.createdBy,
        );
        const stepQuotaDistribution =
          await this.campaignSchedulingService.calculateQuotaDistribution(
            campaign.createdBy,
            cancelledEmails.length,
            quotaInfo.remaining,
            quotaInfo.dailyLimit,
            timezone,
        );

        this.logger.log(
          `Step ${step.stepOrder} (${stepName}): Calculated quota distribution for ${cancelledEmails.length} cancelled emails: ` +
            `${stepQuotaDistribution.length} day(s), Distribution: ${JSON.stringify(
              stepQuotaDistribution.map((d) => ({
                day: d.day,
                range: `${d.startIndex}-${d.endIndex}`,
                quota: d.quotaUsed,
              })),
            )}`,
        );

        // Calculate global email index start for this step (OPTIMIZATION: Issue #5)
        // Use aggregated query instead of loop to avoid N queries
        let globalEmailIndexStart = 0;
        if (step.stepOrder > 1) {
          const previousSteps = steps.filter(
            (s) => s.stepOrder < step.stepOrder,
          );
          const previousStepIds = previousSteps.map((s) => s.id);

          if (previousStepIds.length > 0) {
            // Single aggregated query instead of N queries (OPTIMIZATION: Issue #5)
            const emailCounts = await this.emailMessageModel.findAll({
              where: {
                campaignId,
                campaignStepId: { [Op.in]: previousStepIds },
              },
              attributes: [
                'campaignStepId',
                [SequelizeType.fn('COUNT', SequelizeType.col('id')), 'count'],
              ],
              group: ['campaignStepId'],
              raw: true,
            });

            // Sum up all counts
            globalEmailIndexStart = emailCounts.reduce(
              (sum: number, row: any) => {
                return sum + (parseInt(row.count) || 0);
              },
              0,
            );
          }
        }

        // Get last scheduled email times from previous steps (for step sequencing)
        // Merge with in-memory tracking from previous steps in this resume operation
        const lastScheduledTimeByDayFromPreviousSteps =
          await this.campaignSchedulingService.getLastScheduledTimeByDay(
            campaignId,
            step.stepOrder,
            undefined,
            timezone,
          );

        // CRITICAL: Get last SENT email time and count from CURRENT step for day 0 (to continue from where we left off)
        // This ensures resumed emails continue smoothly from the last sent email, not scattered
        const lastSentEmailInCurrentStep = await this.emailMessageModel.findOne(
          {
            where: {
              campaignId,
              campaignStepId: step.id,
              status: {
                [Op.in]: [
                  EmailMessageStatus.SENT,
                  EmailMessageStatus.DELIVERED,
                ],
              },
              scheduledSendAt: {
                [Op.gte]: getMidnightInTimezone(0, timezone), // Today
                [Op.lt]: getMidnightInTimezone(1, timezone), // Before tomorrow
              },
            },
            order: [['scheduledSendAt', 'DESC']],
            attributes: ['scheduledSendAt'],
          },
        );

        // Count how many emails have already been sent on day 0 in this step
        // This is needed to calculate the correct emailIndexWithinDay when resuming
        const sentEmailsCountOnDay0 = await this.emailMessageModel.count({
          where: {
            campaignId,
            campaignStepId: step.id,
            status: {
              [Op.in]: [EmailMessageStatus.SENT, EmailMessageStatus.DELIVERED],
            },
              scheduledSendAt: {
                [Op.gte]: getMidnightInTimezone(0, timezone), // Today
                [Op.lt]: getMidnightInTimezone(1, timezone), // Before tomorrow
              },
          },
        });

        // If we have a last sent email on day 0, use it as the base time for resuming
        if (
          lastSentEmailInCurrentStep &&
          lastSentEmailInCurrentStep.scheduledSendAt
        ) {
          const day0LastTime = new Date(
            lastSentEmailInCurrentStep.scheduledSendAt,
          );
          const existingDay0Time =
            lastScheduledTimeByDayFromPreviousSteps.get(0);
          if (!existingDay0Time || day0LastTime > existingDay0Time) {
            lastScheduledTimeByDayFromPreviousSteps.set(0, day0LastTime);
            this.logger.log(
              `📅 Resuming Step ${step.stepOrder}: Found ${sentEmailsCountOnDay0} sent email(s) on day 0, last at ${day0LastTime.toISOString()}, will continue from there`,
            );
          }
        }

        // Merge in-memory tracking (from previous steps processed in this resume operation)
        for (const [day, time] of lastScheduledTimeByDay.entries()) {
          const existingTime = lastScheduledTimeByDayFromPreviousSteps.get(day);
          if (!existingTime || time > existingTime) {
            lastScheduledTimeByDayFromPreviousSteps.set(day, time);
          }
        }

        // Re-queue cancelled emails in batches (OPTIMIZATION: Issue #10)
        const firstEmailTimeByDay = new Map<number, Date>();
        const jobsToQueue: Array<{
          emailMessageId: string;
          campaignId: string;
          campaignStepId: string;
          contactId: string;
          organizationId: string;
          userId: string;
          sendAt: Date;
          campaignName: string;
          stepName: string;
        }> = [];
        const emailsToUpdate: Array<{
          email: EmailMessage;
          sendAt: Date;
          emailDay: number;
        }> = [];

        // Bulk check for duplicates (OPTIMIZATION: Issue #1)
        const cancelledContactIds = cancelledEmails.map((e) => e.contactId);
        const existingQueuedEmails = await this.emailMessageModel.findAll({
          where: {
            campaignId,
            campaignStepId: step.id,
            contactId: { [Op.in]: cancelledContactIds },
            status: {
              [Op.in]: EMAIL_STATUS_GROUPS.CANCELLABLE,
            },
          },
          attributes: ['id', 'contactId'],
        });
        const existingQueuedMap = new Map<string, EmailMessage>();
        existingQueuedEmails.forEach((email) => {
          existingQueuedMap.set(email.contactId, email);
        });

        // OPTIMIZATION: Create distribution map once before loop for O(1) lookups
        // This reduces complexity from O(C × log D) to O(C + D)
        const distributionMap = new Map<number, typeof stepQuotaDistribution[0]>();
        stepQuotaDistribution.forEach((dist) => {
          for (let idx = dist.startIndex; idx <= dist.endIndex; idx++) {
            distributionMap.set(idx, dist);
          }
        });

        // Process cancelled emails in batches
        for (let i = 0; i < cancelledEmails.length; i++) {
          const email = cancelledEmails[i];

          // Check for duplicates using pre-loaded map
          const duplicateCheck = existingQueuedMap.get(email.contactId);
          if (duplicateCheck && duplicateCheck.id !== email.id) {
            this.logger.warn(
              `⚠️ Skipping duplicate email for contact ${email.contactId} in step ${step.stepOrder}. ` +
                `Email ${duplicateCheck.id} is already queued/sending.`,
            );
            continue;
          }

          // Calculate global email index for this cancelled email
          const contactIndex = contactIndexMap.get(email.contactId);
          if (contactIndex === undefined) {
            this.logger.warn(
              `⚠️ Contact ${email.contactId} not found in contactIndexMap. ` +
                `Contact may have been removed from contact list. Skipping.`,
            );
            continue;
          }

          const globalEmailIndex = globalEmailIndexStart + contactIndex;

          // Find which day this email belongs to using quota distribution (O(1) lookup)
          const dayDistribution = distributionMap.get(i);

          if (!dayDistribution) {
            this.logger.warn(
              `⚠️ No quota distribution match for cancelled email index ${i}. Skipping.`,
            );
            continue;
          }

          // Use unified scheduling service to calculate send time
          // When resuming on day 0, pass the count of already-sent emails to adjust emailIndexWithinDay
          const sendAt = this.campaignSchedulingService.calculateSendTime(
            step,
            globalEmailIndex,
            dayDistribution,
            contactIndex,
            lastScheduledTimeByDayFromPreviousSteps,
            firstEmailTimeByDay,
            new Date(),
            dayDistribution.day === 0 ? sentEmailsCountOnDay0 : undefined, // Pass sent count for day 0 resume
            timezone,
          );

          const emailDay = this.getDayFromDate(sendAt, timezone);

          // Collect updates for batch processing
          emailsToUpdate.push({ email, sendAt, emailDay });

          // Collect jobs for batch queueing
          jobsToQueue.push({
            emailMessageId: email.id,
            campaignId,
            campaignStepId: step.id,
            contactId: email.contactId,
            organizationId: updatedCampaign.organizationId,
            userId: updatedCampaign.createdBy,
            sendAt,
            campaignName: updatedCampaign.name,
            stepName,
          });
        }

        // Batch update emails (OPTIMIZATION: Issue #10)
        if (emailsToUpdate.length > 0) {
          const sequelize = this.emailMessageModel.sequelize;
          if (sequelize) {
            await sequelize.transaction(async (tx) => {
              // Update emails in batches
              for (
                let i = 0;
                i < emailsToUpdate.length;
                i += BATCH_SIZE_RESUME
              ) {
                const batch = emailsToUpdate.slice(i, i + BATCH_SIZE_RESUME);
                await Promise.all(
                  batch.map(({ email, sendAt }) =>
                    email.update(
                      {
                        status: EmailMessageStatus.QUEUED,
                        queuedAt: new Date(),
                        scheduledSendAt: sendAt,
                      },
                      { transaction: tx },
                    ),
                  ),
                );
              }
            });
          } else {
            // Fallback to individual updates
            for (const { email, sendAt } of emailsToUpdate) {
              await email.update({
                status: EmailMessageStatus.QUEUED,
                queuedAt: new Date(),
                scheduledSendAt: sendAt,
              });
            }
          }

          // Update in-memory tracking
          for (const { sendAt, emailDay } of emailsToUpdate) {
            const currentLastTime = lastScheduledTimeByDay.get(emailDay);
            if (!currentLastTime || sendAt > currentLastTime) {
              lastScheduledTimeByDay.set(emailDay, sendAt);
            }
          }

          // Batch queue jobs (OPTIMIZATION: Issue #6)
          if (jobsToQueue.length > 0) {
            await this.emailSenderQueue.addEmailJobs(jobsToQueue);
          }

          reQueuedEmails += emailsToUpdate.length;
        }

        // After scheduling this step's emails, the next step's quota calculation will see them
        // via getRemainingQuotaForDay which queries the database for scheduledSendAt
        this.logger.debug(
          `Step ${step.stepOrder} (${stepName}): Scheduled ${cancelledEmails.length} cancelled email(s). ` +
            `Next step will see these scheduled emails when calculating quota.`,
        );
      }

      // Check if step is incomplete by counting processed emails vs total contacts
      const processedEmailCount = await this.emailMessageModel.count({
        where: {
          campaignId,
          campaignStepId: step.id,
          status: {
            [Op.in]: EMAIL_STATUS_GROUPS.COMPLETED.concat([EmailMessageStatus.QUEUED]),
          },
        },
      });

      // Step is complete if all contacts have processed emails (sent, delivered, or queued)
      const isComplete = processedEmailCount >= totalContacts;

      // Process incomplete steps by queuing jobs for missing contacts
      if (!isComplete && step.templateId) {
        this.logger.log(
          `Step ${step.id} (${stepName}) is incomplete (${processedEmailCount}/${totalContacts} emails). Processing missing contacts.`,
        );

        // Queue incomplete scheduled steps if overdue, or immediate steps right away
        if (step.triggerType === 'SCHEDULE' && step.scheduleTime) {
          const scheduleTime = new Date(step.scheduleTime);
          // Process overdue scheduled steps immediately
          if (scheduleTime <= new Date()) {
            this.logger.log(`Processing overdue scheduled step ${step.id}`);
            // Track overdue step if not already tracked
            if (!overdueSteps.find((s) => s.stepId === step.id)) {
              overdueSteps.push({
                stepId: step.id,
                stepName,
                scheduleTime,
              });
            }
            await this.campaignStepQueueService.queueStep(
              step,
              updatedCampaign,
            );
            incompleteStepsQueued++;
          }
          // Process immediate steps right away
        } else if (step.triggerType === 'IMMEDIATE') {
          await this.campaignStepQueueService.queueStep(
            step,
            updatedCampaign,
          );
          incompleteStepsQueued++;
        }
      }
    }

    this.logger.log(
      `Campaign ${campaignId} resumed: ${reQueuedEmails} cancelled email(s) re-queued, ` +
        `${incompleteStepsQueued} incomplete step(s) queued for processing`,
    );

    this.logger.log(`Campaign ${campaignId} resumed successfully`);
    const resumedCampaign = (await this.campaignsRepository.findById(
      campaignId,
    )) as Campaign;

    // Attach overdue steps information to campaign object for frontend
    if (overdueSteps.length > 0) {
      (resumedCampaign as any).overdueSteps = overdueSteps;
    }

    return resumedCampaign;
  }
}
