import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize } from 'sequelize';
import { Campaign } from '../entities/campaign.entity';
import { CampaignStep } from '../entities/campaign-step.entity';
import {
  EmailMessage,
  EmailMessageStatus,
} from '../entities/email-message.entity';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import { ContactListMember } from 'src/resources/contact-lists/entities/contact-list-member.entity';
import { RateLimiterService } from 'src/common/services/rate-limiter.service';
import { QuotaManagementService } from 'src/common/services/quota-management.service';
import { getMidnightInTimezone } from 'src/common/utils/timezone.util';
import { EmailSenderQueue } from 'src/configuration/bull/queues/email-sender.queue';
import { MAX_SCHEDULE_DAYS, SAFETY_BUFFER_DAYS } from '../constants/campaign.constants';

export interface SchedulingContext {
  /** Starting global email index for this step (0 for first step, accumulates for subsequent steps) */
  globalEmailIndexStart: number;
  /** Whether this is a resume operation (re-scheduling cancelled emails) */
  isResume?: boolean;
  /** Whether this is adding a new step to an active campaign */
  isNewStep?: boolean;
}

export interface ScheduledEmail {
  emailMessageId: string;
  scheduledSendAt: Date;
  contactId: string;
  globalEmailIndex: number;
}

@Injectable()
export class CampaignSchedulingService {
  private readonly logger = new Logger(CampaignSchedulingService.name);

  constructor(
    @InjectModel(Campaign)
    private readonly campaignModel: typeof Campaign,
    @InjectModel(CampaignStep)
    private readonly campaignStepModel: typeof CampaignStep,
    @InjectModel(EmailMessage)
    private readonly emailMessageModel: typeof EmailMessage,
    @InjectModel(Contact)
    private readonly contactModel: typeof Contact,
    @InjectModel(ContactListMember)
    private readonly contactListMemberModel: typeof ContactListMember,
    private readonly rateLimiterService: RateLimiterService,
    private readonly quotaManagementService: QuotaManagementService,
    private readonly emailSenderQueue: EmailSenderQueue,
  ) {}

  /**
   * Unified scheduling algorithm for all scenarios (activation, resume, add step)
   *
   * This is the single source of truth for email scheduling.
   *
   * Algorithm:
   * 1. Get all subscribed contacts (excluding bounced/unsubscribed)
   * 2. Calculate quota distribution across days
   * 3. For each contact:
   *    a. Find which day this email belongs to (using quota distribution)
   *    b. Calculate base time for that day:
   *       - Day 0 + first email: current time (for immediate) or schedule time
   *       - Day 0 + subsequent: continue from first email time
   *       - Future day + first email:
   *         * If previous step has emails on this day: start after last email + delay
   *         * Else: 12:01 AM
   *       - Future day + subsequent: continue from first email time on that day
   *    c. Add within-day delay (emailIndexWithinDay * delayMinutes)
   *    d. Set scheduledSendAt
   */
  async scheduleEmailsForStep(
    campaignId: string,
    stepId: string,
    context: SchedulingContext,
  ): Promise<ScheduledEmail[]> {
    this.logger.log(
      `📅 Scheduling emails for step ${stepId} in campaign ${campaignId}, ` +
        `context: globalIndexStart=${context.globalEmailIndexStart}, ` +
        `isResume=${context.isResume}, isNewStep=${context.isNewStep}`,
    );

    // 1. Load campaign and step
    const campaign = await this.campaignModel.findByPk(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    const step = await this.campaignStepModel.findByPk(stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found`);
    }

    // Get timezone from step (default to UTC)
    const timezone = step.timezone || 'UTC';
    this.logger.log(`Using timezone: ${timezone} for step ${stepId}`);

    if (!campaign.contactListId) {
      throw new Error(`Campaign ${campaignId} has no contact list`);
    }

    // 2. Get all subscribed contacts (excluding globally bounced/unsubscribed)
    const contactMembers = await this.contactListMemberModel.findAll({
      where: { contactListId: campaign.contactListId },
      include: [
        {
          model: this.contactModel,
          as: 'contact',
          required: true,
        },
      ],
      order: [['contactId', 'ASC']], // Consistent ordering
    });

    const contacts = contactMembers
      .map((member) => member.contact)
      .filter(
        (contact) =>
          contact != null &&
          contact.subscribed !== false &&
          contact.status !== 'BOUNCED', // Exclude globally bounced contacts
      ) as Contact[];

    if (contacts.length === 0) {
      this.logger.warn(
        `No subscribed contacts found for campaign ${campaignId}`,
      );
      return [];
    }

    // Exclude contacts that bounced or unsubscribed in ANY step of this campaign
    // Check all steps in the campaign, excluding the current step being processed
    const allCampaignSteps = await this.campaignStepModel.findAll({
      where: {
        campaignId,
      },
      attributes: ['id'],
    });

    if (allCampaignSteps.length > 0) {
      // Get all step IDs except the current one
      const otherStepIds = allCampaignSteps
        .filter((s) => s.id !== stepId)
        .map((s) => s.id);

      if (otherStepIds.length > 0) {
        // Get contacts who bounced in ANY other step of this campaign
        const bouncedEmails = await this.emailMessageModel.findAll({
          where: {
            campaignId,
            campaignStepId: { [Op.in]: otherStepIds },
            status: EmailMessageStatus.BOUNCED,
          },
          attributes: ['contactId'],
          group: ['contactId'],
          raw: true,
        });

        // Get contacts who unsubscribed in ANY other step of this campaign
        const unsubscribedEmails = await this.emailMessageModel.findAll({
          where: {
            campaignId,
            campaignStepId: { [Op.in]: otherStepIds },
            unsubscribedAt: { [Op.ne]: null },
          },
          attributes: ['contactId'],
          group: ['contactId'],
          raw: true,
        });

        const bouncedContactIds = new Set(
          bouncedEmails.map((email: any) => email.contactId),
        );
        const unsubscribedContactIds = new Set(
          unsubscribedEmails.map((email: any) => email.contactId),
        );

        // Filter out bounced and unsubscribed contacts
        const initialCount = contacts.length;
        const contactsToExclude = contacts.filter(
          (c) => bouncedContactIds.has(c.id) || unsubscribedContactIds.has(c.id),
        );
        
        // Remove excluded contacts from the array
        const excludedIds = new Set([
          ...bouncedContactIds,
          ...unsubscribedContactIds,
        ]);
        const filteredContacts = contacts.filter(
          (c) => !excludedIds.has(c.id),
        );

        if (contactsToExclude.length > 0) {
          this.logger.log(
            `⚠️ Excluding ${contactsToExclude.length} contact(s) from step ${step.stepOrder}: ` +
              `${bouncedContactIds.size} bounced, ${unsubscribedContactIds.size} unsubscribed ` +
              `(from any step in campaign). ` +
              `Contacts: ${contactsToExclude
                .map((c) => c.email || c.id)
                .slice(0, 5)
                .join(', ')}${contactsToExclude.length > 5 ? '...' : ''}`,
          );
        }

        // Update contacts array to only include valid contacts
        contacts.length = 0;
        contacts.push(...filteredContacts);

        this.logger.log(
          `Filtered contacts for step ${step.stepOrder}: ${initialCount} → ${contacts.length} (excluded ${contactsToExclude.length})`,
        );
      }
    }

    this.logger.log(
      `Found ${contacts.length} subscribed contacts for step ${stepId}`,
    );

    // 3. Calculate quota distribution
    const totalEmails = contacts.length;
    this.logger.log(
      `🎯 [SCHEDULE] scheduleEmailsForStep: campaignId=${campaignId}, stepId=${stepId}, totalEmails=${totalEmails}, timezone=${timezone}`
    );
    
    const quotaStats = await this.rateLimiterService.getQuotaStats(
      campaign.createdBy,
    );
    this.logger.log(
      `🎯 [SCHEDULE] Initial quota stats: ` +
      `used=${quotaStats.used}, limit=${quotaStats.limit}, remaining=${quotaStats.remaining}, ` +
      `percentUsed=${quotaStats.percentUsed.toFixed(2)}%, resetAt=${quotaStats.resetAt.toISOString()}`
    );
    
    // Get dynamic daily limit from subscription plan
    const dailyLimit = await this.quotaManagementService.getDailyEmailLimit(
      campaign.createdBy,
    );
    this.logger.log(
      `🎯 [SCHEDULE] Daily limit from plan: ${dailyLimit} emails/day`
    );
    
    // For scheduled campaigns, determine which day the scheduleTime falls on
    let startDay: number | undefined = undefined;
    if (step.triggerType === 'SCHEDULE' && step.scheduleTime) {
      const scheduleTime = new Date(step.scheduleTime);
      startDay = this.getDayFromScheduleTime(scheduleTime, timezone);
      this.logger.log(
        `📅 Scheduled campaign: scheduleTime=${scheduleTime.toISOString()}, startDay=${startDay}`
      );
    }
    
    this.logger.log(
      `🎯 [SCHEDULE] Calling calculateQuotaDistribution with: ` +
      `totalEmails=${totalEmails}, remainingQuota=${quotaStats.remaining}, dailyLimit=${dailyLimit}, startDay=${startDay ?? 0}`
    );
    
    const quotaDistribution = await this.calculateQuotaDistribution(
      campaign.createdBy,
      totalEmails,
      quotaStats.remaining,
      dailyLimit,
      timezone,
      startDay,
    );
    
    this.logger.log(
      `🎯 [SCHEDULE] Quota distribution received: ${JSON.stringify(quotaDistribution)}`
    );

    this.logger.log(
      `Quota distribution for ${totalEmails} emails: ${quotaDistribution.length} day(s), ` +
        `Distribution: ${JSON.stringify(
          quotaDistribution.map((d) => ({
            day: d.day,
            range: `${d.startIndex}-${d.endIndex}`,
            quota: d.quotaUsed,
          })),
        )}`,
    );

    // 4. Get last scheduled email times from previous steps (for step sequencing)
    const lastScheduledTimeByDay = await this.getLastScheduledTimeByDay(
      campaignId,
      step.stepOrder,
      undefined,
      timezone,
    );

    // 5. Calculate send times for each contact
    const scheduledEmails: ScheduledEmail[] = [];
    const firstEmailTimeByDay = new Map<number, Date>();
    const now = new Date();

    // OPTIMIZATION: Create distribution map for O(1) lookups instead of O(log D) array.find()
    // This reduces complexity from O(C × log D) to O(C + D)
    const distributionMap = new Map<number, typeof quotaDistribution[0]>();
    quotaDistribution.forEach((dist) => {
      for (let idx = dist.startIndex; idx <= dist.endIndex; idx++) {
        distributionMap.set(idx, dist);
      }
    });

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const globalEmailIndex = context.globalEmailIndexStart + i;

      // Find which day this email belongs to (O(1) lookup)
      const dayDistribution = distributionMap.get(globalEmailIndex);

      if (!dayDistribution) {
        this.logger.warn(
          `No quota distribution match for email index ${globalEmailIndex}. ` +
            `Skipping contact ${contact.id}`,
        );
        continue;
      }

      // Calculate send time using unified algorithm
      const scheduledSendAt = this.calculateSendTime(
        step,
        globalEmailIndex,
        dayDistribution,
        i, // contact index within step
        lastScheduledTimeByDay,
        firstEmailTimeByDay,
        now,
        undefined, // alreadySentCountOnDay0
        timezone,
      );

      scheduledEmails.push({
        emailMessageId: '', // Will be set when email is created
        scheduledSendAt,
        contactId: contact.id,
        globalEmailIndex,
      });
    }

    this.logger.log(
      `✅ Scheduled ${scheduledEmails.length} emails for step ${stepId}`,
    );

    return scheduledEmails;
  }

  /**
   * Helper function to determine which day a scheduleTime falls on
   * @param scheduleTime The scheduled time (UTC Date)
   * @param timezone The timezone to use for day calculation
   * @returns Day offset (0 = today, 1 = tomorrow, etc.)
   */
  getDayFromScheduleTime(scheduleTime: Date, timezone: string = 'UTC'): number {
    const now = new Date();
    const todayStart = getMidnightInTimezone(0, timezone);
    const scheduleDate = new Date(scheduleTime);
    
    // Find which day the scheduleTime falls on
    for (let day = 0; day <= MAX_SCHEDULE_DAYS; day++) {
      const dayStart = getMidnightInTimezone(day, timezone);
      const dayEnd = getMidnightInTimezone(day + 1, timezone);
      
      if (scheduleDate >= dayStart && scheduleDate < dayEnd) {
        this.logger.log(
          `📅 Schedule time ${scheduleDate.toISOString()} falls on day ${day} (timezone: ${timezone})`
        );
        return day;
      }
    }
    
    // If scheduleTime is in the past, return 0 (today)
    if (scheduleDate < todayStart) {
      this.logger.warn(
        `⚠️ Schedule time ${scheduleDate.toISOString()} is in the past, using day 0`
      );
      return 0;
    }
    
    // If scheduleTime is beyond MAX_SCHEDULE_DAYS, return MAX_SCHEDULE_DAYS
    this.logger.warn(
      `⚠️ Schedule time ${scheduleDate.toISOString()} is beyond ${MAX_SCHEDULE_DAYS} days, using day ${MAX_SCHEDULE_DAYS}`
    );
    return MAX_SCHEDULE_DAYS;
  }

  /**
   * Calculate quota distribution across days
   * Optimized: Uses batch quota checking instead of per-day queries (OPTIMIZATION: Issue #4)
   * Exposed as public method for use in activation validation
   * 
   * @param startDay Optional day to start distribution from (for scheduled campaigns)
   *                 If not provided, starts from day 0 (today)
   */
  async calculateQuotaDistribution(
    userId: string,
    totalEmails: number,
    remainingQuota: number,
    dailyLimit: number,
    timezone: string = 'UTC',
    startDay?: number,
  ): Promise<
    Array<{
      day: number;
      startIndex: number;
      endIndex: number;
      quotaUsed: number;
    }>
  > {
    // Determine start day: use provided startDay, or calculate from scheduleTime if provided
    let actualStartDay = startDay ?? 0;
    
    this.logger.log(
      `🚀 [QUOTA-DIST] calculateQuotaDistribution START: ` +
      `userId=${userId}, totalEmails=${totalEmails}, remainingQuota=${remainingQuota}, dailyLimit=${dailyLimit}, timezone=${timezone}, startDay=${actualStartDay}`
    );
    
    const distribution: Array<{
      day: number;
      startIndex: number;
      endIndex: number;
      quotaUsed: number;
    }> = [];
    let currentIndex = 0;
    let day = actualStartDay;

    // Calculate maximum days needed (with safety buffer)
    const maxDaysNeeded = Math.ceil(totalEmails / dailyLimit) + SAFETY_BUFFER_DAYS;
    // For scheduled campaigns, we need to query from startDay onwards, but also account for
    // the case where startDay has no quota - we need to find the first available day
    // So we query from startDay to startDay + maxDaysNeeded, but ensure we query enough days
    const endDay = Math.min(actualStartDay + maxDaysNeeded, MAX_SCHEDULE_DAYS);
    
    this.logger.log(
      `🚀 [QUOTA-DIST] Calculated endDay: ${endDay} (startDay: ${actualStartDay}, needed: ${maxDaysNeeded}, limit: ${MAX_SCHEDULE_DAYS})`
    );

    // Batch query quota for all days at once (OPTIMIZATION: Issue #4)
    // Query from startDay to endDay to account for scheduled campaigns starting on future days
    // IMPORTANT: Even if startDay has no quota, we'll skip to the first available day
    this.logger.log(
      `🚀 [QUOTA-DIST] Batch querying quota for days ${actualStartDay}-${endDay} (${endDay - actualStartDay + 1} days)`
    );
    const quotaMap = await this.rateLimiterService.getRemainingQuotaForDays(
      userId,
      actualStartDay,
      endDay,
      timezone,
    );
    
    // For scheduled campaigns: If startDay has no quota, find the first day with available quota
    // This ensures scheduled campaigns don't start on days with no quota
    if (startDay !== undefined && actualStartDay === startDay) {
      const startDayQuota = quotaMap.get(actualStartDay) ?? 0;
      if (startDayQuota <= 0) {
        this.logger.log(
          `⚠️ [QUOTA-DIST] Scheduled campaign startDay ${actualStartDay} has no quota (${startDayQuota}). ` +
          `Finding first available day with quota...`
        );
        
        // Find first day with available quota starting from startDay
        let firstAvailableDay = actualStartDay;
        for (let checkDay = actualStartDay; checkDay <= endDay; checkDay++) {
          const quota = quotaMap.get(checkDay) ?? 0;
          if (quota > 0) {
            firstAvailableDay = checkDay;
            this.logger.log(
              `✅ [QUOTA-DIST] Found first available day: ${firstAvailableDay} with quota: ${quota}`
            );
            break;
          }
        }
        
        // If we found a day with quota, update actualStartDay and the loop variable
        if (firstAvailableDay > actualStartDay) {
          actualStartDay = firstAvailableDay;
          day = actualStartDay; // Update the loop variable for the main while loop
          this.logger.log(
            `📅 [QUOTA-DIST] Updated startDay from ${startDay} to ${actualStartDay} (first day with available quota). ` +
            `Will start distribution from day ${actualStartDay} instead of scheduled day ${startDay}.`
          );
        } else if (firstAvailableDay === actualStartDay && startDayQuota <= 0) {
          // No quota found in the queried range - this is a problem
          this.logger.warn(
            `⚠️ [QUOTA-DIST] No quota available from startDay ${startDay} to endDay ${endDay}. ` +
            `Campaign may not be able to schedule all emails. Will attempt to continue anyway.`
          );
        }
      }
    }
    
    this.logger.log(
      `🚀 [QUOTA-DIST] Quota map received: ${JSON.stringify(Array.from(quotaMap.entries()))}`
    );

    while (currentIndex < totalEmails) {
      // Get remaining quota from pre-loaded map (OPTIMIZATION: Issue #4)
      const remainingForDay = quotaMap.get(day) ?? 0;
      
      this.logger.log(
        `🚀 [QUOTA-DIST] Day ${day}: remainingForDay=${remainingForDay}, currentIndex=${currentIndex}, totalEmails=${totalEmails}`
      );

      if (remainingForDay <= 0) {
        // No quota available for this day, skip to next day
        this.logger.log(`⏭️ [QUOTA-DIST] Skipping day ${day} (no quota available: ${remainingForDay})`);
        day++;
        continue;
      }

      // Fill up to the remaining quota for this day
      const emailsForDay = Math.min(
        remainingForDay,
        totalEmails - currentIndex,
      );
      
      this.logger.log(
        `🚀 [QUOTA-DIST] Day ${day}: emailsForDay=${emailsForDay} ` +
        `(min of remainingForDay=${remainingForDay} and remaining=${totalEmails - currentIndex})`
      );
      
      if (emailsForDay > 0) {
        distribution.push({
          day,
          startIndex: currentIndex,
          endIndex: currentIndex + emailsForDay - 1,
          quotaUsed: emailsForDay,
        });
        currentIndex += emailsForDay;
        this.logger.log(
          `✅ [QUOTA-DIST] Scheduled ${emailsForDay} email(s) for day ${day} ` +
          `(indices ${currentIndex - emailsForDay} to ${currentIndex - 1}), ` +
          `remaining emails to schedule: ${totalEmails - currentIndex}`
        );
      }

      day++;

      // Safety limit: don't check beyond max schedule days
      if (day > MAX_SCHEDULE_DAYS) {
        this.logger.error(
          `❌ [QUOTA-DIST] Quota distribution exceeded ${MAX_SCHEDULE_DAYS} days. Remaining emails: ${totalEmails - currentIndex}`,
        );
        break;
      }
    }

    // Check if all emails were distributed
    const totalDistributed = distribution.reduce((sum, d) => sum + d.quotaUsed, 0);
    if (totalDistributed < totalEmails) {
      this.logger.warn(
        `⚠️ [QUOTA-DIST] Quota distribution incomplete: ${totalDistributed}/${totalEmails} emails distributed. ` +
        `This might indicate insufficient quota or a calculation error.`
      );
    }

    this.logger.log(
      `📊 [QUOTA-DIST] calculateQuotaDistribution COMPLETE: ` +
      `${totalDistributed}/${totalEmails} emails across ${distribution.length} day(s). ` +
      `Distribution: ${JSON.stringify(distribution)}`
    );

    return distribution;
  }

  /**
   * Get last scheduled email time from previous steps for each day (OPTIMIZATION: Issue #5)
   * Uses single query with date range instead of per-day queries
   * This ensures step sequencing: each step's first email starts after previous step's last email
   * Made public for use in resume and other scenarios
   */
  async getLastScheduledTimeByDay(
    campaignId: string,
    currentStepOrder: number,
    maxDay: number = 30,
    timezone: string = 'UTC',
  ): Promise<Map<number, Date>> {
    const lastScheduledTimeByDay = new Map<number, Date>();

    // Find all steps with stepOrder < currentStepOrder
    const previousSteps = await this.campaignStepModel.findAll({
      where: {
        campaignId,
        stepOrder: {
          [Op.lt]: currentStepOrder,
        },
      },
      attributes: ['id'],
    });

    if (previousSteps.length === 0) {
      return lastScheduledTimeByDay; // No previous steps
    }

    const previousStepIds = previousSteps.map((s) => s.id);

    // Single query to get all scheduled emails from previous steps for date range (OPTIMIZATION: Issue #5)
    const rangeStart = getMidnightInTimezone(0, timezone);
    const rangeEnd = getMidnightInTimezone(maxDay + 1, timezone);

    const scheduledEmails = await this.emailMessageModel.findAll({
      where: {
        campaignId,
        scheduledSendAt: {
          [Op.gte]: rangeStart,
          [Op.lt]: rangeEnd,
        },
        status: {
          [Op.in]: [
            EmailMessageStatus.QUEUED,
            EmailMessageStatus.SENDING,
            EmailMessageStatus.SENT,
            EmailMessageStatus.DELIVERED,
            EmailMessageStatus.BOUNCED,
            EmailMessageStatus.FAILED,
          ],
        },
        campaignStepId: {
          [Op.in]: previousStepIds,
        },
      },
      attributes: ['scheduledSendAt'],
      order: [['scheduledSendAt', 'DESC']],
      raw: true,
    });

    // Group by day and find max time per day
    for (let day = 0; day <= maxDay; day++) {
      const dayStart = getMidnightInTimezone(day, timezone);
      const dayEnd = getMidnightInTimezone(day + 1, timezone);

      // Find the latest email for this day
      let lastTimeForDay: Date | null = null;
      for (const email of scheduledEmails) {
        const sendAt = new Date(email.scheduledSendAt);
        if (sendAt >= dayStart && sendAt < dayEnd) {
          if (!lastTimeForDay || sendAt > lastTimeForDay) {
            lastTimeForDay = sendAt;
          }
        }
      }

      if (lastTimeForDay) {
        lastScheduledTimeByDay.set(day, lastTimeForDay);
        this.logger.debug(
          `📅 Day ${day}: Last scheduled email from previous steps: ${lastTimeForDay.toISOString()}`,
        );
      }
    }

    this.logger.debug(
      `📊 Retrieved last scheduled times for ${lastScheduledTimeByDay.size} day(s) using single query (instead of ${maxDay + 1} queries)`,
    );

    return lastScheduledTimeByDay;
  }

  /**
   * Calculate send time for an email using unified algorithm
   *
   * Rules:
   * - Day 0 + first email: current time (for immediate) or schedule time
   * - Day 0 + subsequent: continue from first email time
   * - Future day + first email:
   *   * If previous step has emails on this day: start after last email + delay
   *   * Else: 12:01 AM
   * - Future day + subsequent: continue from first email time on that day
   *
   * Made public for use in campaign processor
   */
  calculateSendTime(
    step: CampaignStep,
    globalEmailIndex: number,
    dayDistribution: { day: number; startIndex: number; endIndex: number },
    contactIndex: number,
    lastScheduledTimeByDay?: Map<number, Date>,
    firstEmailTimeByDay?: Map<number, Date>,
    now?: Date,
    alreadySentCountOnDay0?: number, // For resume: count of emails already sent on day 0
    timezone: string = 'UTC',
  ): Date {
    const currentNow = now || new Date();
    const lastScheduledMap = lastScheduledTimeByDay || new Map<number, Date>();
    const firstEmailMap = firstEmailTimeByDay || new Map<number, Date>();
    const day = dayDistribution.day;

    // CRITICAL: When resuming on day 0, adjust emailIndexWithinDay to account for already-sent emails
    // This ensures emails continue sequentially from the last sent email, not scattered
    let emailIndexWithinDay: number;
    if (
      day === 0 &&
      alreadySentCountOnDay0 !== undefined &&
      alreadySentCountOnDay0 > 0
    ) {
      // Resume scenario: Calculate position relative to already-sent emails
      // Example: 7 emails sent (indices 0-6), first cancelled email at globalIndex=7
      // emailIndexWithinDay should be 0 (first after the 7 sent), not 7
      emailIndexWithinDay = globalEmailIndex - alreadySentCountOnDay0;
      this.logger.debug(
        `📅 Resume on day 0: globalEmailIndex=${globalEmailIndex}, alreadySentCount=${alreadySentCountOnDay0}, ` +
          `emailIndexWithinDay=${emailIndexWithinDay} (adjusted for resume)`,
      );
    } else {
      // Normal scenario: Calculate position relative to quota distribution startIndex
      emailIndexWithinDay = globalEmailIndex - dayDistribution.startIndex;
    }

    const delayMinutes = step.delayMinutes || 1;
    const isFirstEmailOnDay = emailIndexWithinDay === 0;

    // Calculate base time for the target day
    const targetDayBaseTime = getMidnightInTimezone(day, timezone);
    const targetDayBaseTimeWithOffset = new Date(
      targetDayBaseTime.getTime() + 60 * 1000,
    ); // 12:01 AM

    let effectiveBaseTime: Date;

    if (day === 0 && isFirstEmailOnDay) {
      // Day 0 + first email: Check if there's a last scheduled time (from resume scenario)
      // If resuming, continue from last sent email time instead of starting fresh
      const lastScheduledTimeOnDay0 = lastScheduledMap.get(0);
      if (
        lastScheduledTimeOnDay0 &&
        lastScheduledTimeOnDay0 >= getMidnightInTimezone(0, timezone)
      ) {
        // Resume scenario: Continue from last sent email time on day 0
        effectiveBaseTime = lastScheduledTimeOnDay0;
        this.logger.debug(
          `📅 First email on day 0 (RESUME): Continuing from last sent email at ${effectiveBaseTime.toISOString()}`,
        );
      } else if (step.triggerType === 'SCHEDULE' && step.scheduleTime) {
        // Scheduled campaign: Use schedule time or current time (whichever is later)
        const scheduleTime = new Date(step.scheduleTime);
        effectiveBaseTime =
          scheduleTime > currentNow ? scheduleTime : currentNow;
        this.logger.debug(
          `📅 First email on day 0 (SCHEDULED): Using ${effectiveBaseTime.toISOString()} as base`,
        );
      } else {
        // Immediate campaign: Start now
        effectiveBaseTime = currentNow;
        this.logger.debug(
          `📅 First email on day 0 (IMMEDIATE): Using ${effectiveBaseTime.toISOString()} as base`,
        );
      }
      firstEmailMap.set(0, effectiveBaseTime);
    } else if (day === 0 && !isFirstEmailOnDay) {
      // Day 0 + subsequent: Continue from first email time
      const firstEmailTime = firstEmailMap.get(0);
      if (firstEmailTime) {
        effectiveBaseTime = firstEmailTime;
      } else {
        // Fallback: use current time
        effectiveBaseTime = currentNow;
        firstEmailMap.set(0, currentNow);
      }
      this.logger.debug(
        `📅 Email ${globalEmailIndex} on day 0: Continuing from first email time ${effectiveBaseTime.toISOString()}`,
      );
    } else if (day > 0 && isFirstEmailOnDay) {
      // Future day + first email: Start after previous step's last email OR scheduled time/preserved start time
      const lastScheduledTimeOnThisDay = lastScheduledMap.get(day);
      if (lastScheduledTimeOnThisDay) {
        // Previous step has emails on this day: start after last email + delay
        effectiveBaseTime = new Date(
          lastScheduledTimeOnThisDay.getTime() + delayMinutes * 60 * 1000,
        );
        this.logger.debug(
          `📅 First email on day ${day}: Starting after previous step's last email ` +
            `${lastScheduledTimeOnThisDay.toISOString()} + ${delayMinutes}min = ${effectiveBaseTime.toISOString()}`,
        );
      } else if (step.triggerType === 'SCHEDULE' && step.scheduleTime) {
        // Scheduled step: Preserve scheduled time on future days
        const scheduleTime = new Date(step.scheduleTime);
        const moment = require('moment-timezone');
        const localTime = moment.utc(scheduleTime).tz(timezone);
        const scheduledHour = localTime.hour();
        const scheduledMinute = localTime.minute();
        const scheduledSecond = localTime.second();
        
        // Get midnight of target day in step timezone
        const midnight = getMidnightInTimezone(day, timezone);
        
        // Apply scheduled time to that day
        effectiveBaseTime = new Date(midnight.getTime() + 
          scheduledHour * 3600000 + scheduledMinute * 60000 + scheduledSecond * 1000);
        this.logger.debug(
          `📅 First email on day ${day} (SCHEDULED): Using scheduled time ${effectiveBaseTime.toISOString()}`,
        );
      } else {
        // Immediate step: Preserve start time from day 0 on future days
        // This ensures emails start at the same time of day as when the campaign was activated
        // Get the first email time from day 0 (which is the activation time)
        const firstEmailTimeDay0 = firstEmailMap.get(0);
        if (firstEmailTimeDay0) {
          // Extract hour, minute, second from day 0 start time in step timezone
          const moment = require('moment-timezone');
          const day0TimeInTZ = moment.utc(firstEmailTimeDay0).tz(timezone);
          const startHour = day0TimeInTZ.hour();
          const startMinute = day0TimeInTZ.minute();
          const startSecond = day0TimeInTZ.second();
          
          // Get midnight of target day in step timezone
          const midnight = getMidnightInTimezone(day, timezone);
          
          // Apply preserved start time to that day (same time as campaign start)
          effectiveBaseTime = new Date(midnight.getTime() + 
            startHour * 3600000 + startMinute * 60000 + startSecond * 1000);
          this.logger.debug(
            `📅 First email on day ${day} (IMMEDIATE): Preserving start time from day 0 ` +
            `(${day0TimeInTZ.format('HH:mm:ss')} ${timezone}) = ${effectiveBaseTime.toISOString()}`,
          );
        } else {
          // Fallback: use 12:01 AM if day 0 time not available
          effectiveBaseTime = targetDayBaseTimeWithOffset;
          this.logger.debug(
            `📅 First email on day ${day} (IMMEDIATE): Day 0 time not found, using 12:01 AM fallback ${effectiveBaseTime.toISOString()}`,
          );
        }
      }
      firstEmailMap.set(day, effectiveBaseTime);
    } else {
      // Future day + subsequent: Continue from first email time on that day
      const firstEmailTime = firstEmailMap.get(day);
      if (firstEmailTime) {
        effectiveBaseTime = firstEmailTime;
      } else {
        // Fallback: use 12:01 AM
        effectiveBaseTime = targetDayBaseTimeWithOffset;
        firstEmailMap.set(day, effectiveBaseTime);
        this.logger.warn(
          `⚠️ Email ${globalEmailIndex} on day ${day}: First email time not found, using 12:01 AM fallback`,
        );
      }
      this.logger.debug(
        `📅 Email ${globalEmailIndex} on day ${day}: Continuing from first email time ${effectiveBaseTime.toISOString()}`,
      );
    }

    // Add within-day delay
    const totalDelayMs = emailIndexWithinDay * delayMinutes * 60 * 1000;
    const finalSendTime = new Date(effectiveBaseTime.getTime() + totalDelayMs);

    this.logger.debug(
      `📅 Final send time for email ${globalEmailIndex} (day ${day}, index ${emailIndexWithinDay}): ` +
        `${finalSendTime.toISOString()} (base: ${effectiveBaseTime.toISOString()}, delay: ${totalDelayMs}ms)`,
    );

    return finalSendTime;
  }
}
