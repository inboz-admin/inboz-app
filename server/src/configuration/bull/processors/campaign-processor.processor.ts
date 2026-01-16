import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize } from 'sequelize';
import { Campaign } from 'src/resources/campaigns/entities/campaign.entity';
import { CampaignStep } from 'src/resources/campaigns/entities/campaign-step.entity';
import { EmailMessage, EmailMessageStatus } from 'src/resources/campaigns/entities/email-message.entity';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import { ContactList } from 'src/resources/contact-lists/entities/contact-list.entity';
import { ContactListMember } from 'src/resources/contact-lists/entities/contact-list-member.entity';
import { EmailTemplate } from 'src/resources/email-templates/entities/email-template.entity';
import { EmailPersonalizationService } from 'src/common/services/email-personalization.service';
import { EmailSenderQueue } from '../queues/email-sender.queue';
import { WsGateway } from 'src/resources/ws/ws.gateway';
import { GmailOAuthToken } from 'src/resources/users/entities/gmail-oauth-token.entity';
import { getMidnightInTimezone } from 'src/common/utils/timezone.util';
import { RateLimiterService } from 'src/common/services/rate-limiter.service';
import { QuotaManagementService } from 'src/common/services/quota-management.service';
import { CampaignSchedulingService } from 'src/resources/campaigns/services/campaign-scheduling.service';
import { MAX_SCHEDULE_DAYS } from 'src/resources/campaigns/constants/campaign.constants';
import { QueueName } from '../enums/queue.enum';

/**
 * BullMQ Processor for Campaign Processing
 * Prepares and queues individual emails for a campaign
 */
@Processor(QueueName.CAMPAIGN_PROCESSOR)
export class CampaignProcessorProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignProcessorProcessor.name);
  private lastEmitTime = 0;
  private readonly throttleInterval = 500; // 500ms

  constructor(
    @InjectModel(Campaign)
    private readonly campaignModel: typeof Campaign,
    @InjectModel(CampaignStep)
    private readonly campaignStepModel: typeof CampaignStep,
    @InjectModel(EmailMessage)
    private readonly emailMessageModel: typeof EmailMessage,
    @InjectModel(EmailTemplate)
    private readonly emailTemplateModel: typeof EmailTemplate,
    @InjectModel(Contact)
    private readonly contactModel: typeof Contact,
    @InjectModel(ContactListMember)
    private readonly contactListMemberModel: typeof ContactListMember,
    @InjectModel(GmailOAuthToken)
    private readonly gmailTokenModel: typeof GmailOAuthToken,
    private readonly emailPersonalizationService: EmailPersonalizationService,
    private readonly emailSenderQueue: EmailSenderQueue,
    private readonly wsGateway: WsGateway,
    private readonly rateLimiterService: RateLimiterService,
    private readonly quotaManagementService: QuotaManagementService,
    private readonly campaignSchedulingService: CampaignSchedulingService,
  ) {
    super();
    this.logger.log('CampaignProcessorProcessor initialized');
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`🚀 Processing job ${job.id} of type ${job.name}`);
    
    // Route to appropriate handler based on job type
    if (job.name === 'process-new-step') {
      return this.processNewStep(job);
    } else {
      return this.processFullCampaign(job);
    }
  }

  /**
   * Process a batch of contacts and create emails in bulk (OPTIMIZATION: Issue #6)
   * This method handles email creation, personalization, and queueing for a batch of contacts
   */
  private async processContactBatch(
    batch: Contact[],
    batchIndex: number,
    campaign: Campaign,
    step: CampaignStep,
    template: EmailTemplate,
    senderEmail: string,
    userId: string,
    organizationId: string,
    existingEmailMap: Map<string, EmailMessage>,
    useQuotaDistribution: boolean,
    quotaDistribution: any,
    emailsFromPreviousSteps: number,
    lastScheduledTimeByDayFromPreviousSteps: Map<number, Date>,
    firstEmailTimeByDay: Map<number, Date>,
    // Fallback scheduling state
    currentDay: number,
    emailsOnCurrentDay: number,
    remainingOnCurrentDay: number,
    currentDayStart: Date,
    currentDayEnd: Date,
    firstEmailTimeOnDay0: Date | null,
    dailyLimit: number,
    getDayBoundaries: (dayOffset: number) => { start: Date; end: Date },
  ): Promise<{
    created: number;
    skipped: number;
    errors: number;
    emails: EmailMessage[];
    jobs: Array<{
      emailMessageId: string;
      campaignId: string;
      campaignStepId: string;
      contactId: string;
      organizationId: string;
      userId: string;
      sendAt: Date;
      campaignName: string;
      stepName: string;
      sendFormat?: string; // Template sendFormat (HTML or TEXT)
    }>;
    updatedState: {
      currentDay: number;
      emailsOnCurrentDay: number;
      remainingOnCurrentDay: number;
      currentDayStart: Date;
      currentDayEnd: Date;
      firstEmailTimeOnDay0: Date | null;
    };
  }> {
    const emailsToCreate: Array<{
      organizationId: string;
      campaignId: string;
      campaignStepId: string;
      contactId: string;
      subject: string;
      htmlContent: string;
      textContent: string;
      status: EmailMessageStatus;
      queuedAt: Date;
      scheduledSendAt: Date;
      sentFromEmail: string;
      createdBy: string;
    }> = [];
    
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
      sendFormat?: string; // Template sendFormat (HTML or TEXT)
    }> = [];
    
    let skipped = 0;
    let errors = 0;
    const stepName = step.name || `Step ${step.stepOrder}`;
    const now = new Date();
    
    // Track state for fallback scheduling
    let localCurrentDay = currentDay;
    let localEmailsOnCurrentDay = emailsOnCurrentDay;
    let localRemainingOnCurrentDay = remainingOnCurrentDay;
    let localCurrentDayStart = currentDayStart;
    let localCurrentDayEnd = currentDayEnd;
    let localFirstEmailTimeOnDay0 = firstEmailTimeOnDay0;
    
    for (let i = 0; i < batch.length; i++) {
      const contact = batch[i];
      const contactIndex = batchIndex + i; // Global contact index
      
      try {
        // Check if contact is subscribed and not globally bounced
        if (contact.subscribed === false) {
          this.logger.debug(
            `⏭️ Skipping contact ${contact.id} (${contact.email || 'no email'}): unsubscribed`
          );
          skipped++;
          continue;
        }
        
        if (contact.status === 'BOUNCED') {
          this.logger.debug(
            `⏭️ Skipping contact ${contact.id} (${contact.email || 'no email'}): globally bounced`
          );
          skipped++;
          continue;
        }
        
        // Check if email already exists
        if (existingEmailMap.has(contact.id)) {
          skipped++;
          continue;
        }
        
        // Calculate send time
        let sendAt: Date;
        
        if (useQuotaDistribution && quotaDistribution) {
          const globalEmailIndex = emailsFromPreviousSteps + contactIndex;
          const dayDistribution = quotaDistribution.find(
            (d: { day: number; startIndex: number; endIndex: number }) =>
              globalEmailIndex >= d.startIndex && globalEmailIndex <= d.endIndex
          );
          
          if (dayDistribution) {
            sendAt = this.campaignSchedulingService.calculateSendTime(
              step,
              globalEmailIndex,
              dayDistribution,
              contactIndex,
              lastScheduledTimeByDayFromPreviousSteps,
              firstEmailTimeByDay,
              now,
            );
          } else {
            // Fallback
            const delayMinutes = step.delayMinutes || 1;
            const baseTime = step.triggerType === 'SCHEDULE' && step.scheduleTime
              ? new Date(step.scheduleTime)
              : now;
            sendAt = new Date(baseTime.getTime() + contactIndex * delayMinutes * 60 * 1000);
          }
        } else {
          // Fallback scheduling logic
          if (localRemainingOnCurrentDay <= 0) {
            localCurrentDay++;
            localEmailsOnCurrentDay = 0;
            const dayBounds = getDayBoundaries(localCurrentDay);
            localCurrentDayStart = dayBounds.start;
            localCurrentDayEnd = dayBounds.end;
            localRemainingOnCurrentDay = dailyLimit; // Simplified - would need to check queue
          }
          
          const delayMinutes = step.delayMinutes || 1;
          let effectiveBaseTime: Date;
          
          if (localCurrentDay === 0) {
            if (localEmailsOnCurrentDay === 0) {
              effectiveBaseTime = now;
              localFirstEmailTimeOnDay0 = now;
            } else {
              effectiveBaseTime = localFirstEmailTimeOnDay0 || now;
            }
          } else {
            effectiveBaseTime = new Date(localCurrentDayStart.getTime() + 60 * 1000);
          }
          
          if (step.triggerType === 'SCHEDULE' && step.scheduleTime) {
            const scheduleTime = new Date(step.scheduleTime);
            if (scheduleTime > effectiveBaseTime) {
              effectiveBaseTime = scheduleTime;
            }
          }
          
          const totalDelayMs = localEmailsOnCurrentDay * delayMinutes * 60 * 1000;
          sendAt = new Date(effectiveBaseTime.getTime() + totalDelayMs);
          
          localEmailsOnCurrentDay++;
          localRemainingOnCurrentDay--;
        }
        
        // Personalize content
        const personalized = this.emailPersonalizationService.personalizeContent(
          template.subject,
          template.htmlContent,
          template.textContent || '',
          contact,
        );
        
        // Prepare email data for bulk create
        emailsToCreate.push({
          organizationId,
          campaignId: campaign.id,
          campaignStepId: step.id,
          contactId: contact.id,
          subject: personalized.subject,
          htmlContent: personalized.html,
          textContent: personalized.text,
          status: EmailMessageStatus.QUEUED,
          queuedAt: new Date(),
          scheduledSendAt: sendAt,
          sentFromEmail: senderEmail,
          createdBy: userId,
        });
        
        // Prepare job data (will be queued after emails are created)
        jobsToQueue.push({
          emailMessageId: '', // Will be set after email creation
          campaignId: campaign.id,
          campaignStepId: step.id,
          contactId: contact.id,
          organizationId,
          userId,
          sendAt,
          campaignName: campaign.name,
          stepName,
          sendFormat: template.sendFormat, // Pass template sendFormat for tracking injection
        });
      } catch (error) {
        errors++;
        this.logger.error(
          `Error processing contact ${contact.id} in batch: ${error}`,
        );
      }
    }
    
    // Bulk create emails in transaction (OPTIMIZATION: Issue #7)
    let createdEmails: EmailMessage[] = [];
    if (emailsToCreate.length > 0) {
      try {
        // Get Sequelize instance from model
        const sequelize = this.emailMessageModel.sequelize;
        if (!sequelize) {
          throw new Error('Sequelize instance not available');
        }
        
        // Use transaction for batch creation (OPTIMIZATION: Issue #7)
        createdEmails = await sequelize.transaction(async (tx) => {
          const created = await this.emailMessageModel.bulkCreate(emailsToCreate, {
            returning: true,
            transaction: tx,
          }) as EmailMessage[];
          return created;
        });
        
        // Update job data with email IDs
        for (let i = 0; i < jobsToQueue.length; i++) {
          jobsToQueue[i].emailMessageId = createdEmails[i].id;
        }
      } catch (error) {
        this.logger.error(`Error bulk creating emails: ${error}`);
        errors += emailsToCreate.length;
        return {
          created: 0,
          skipped,
          errors,
          emails: [],
          jobs: [],
          updatedState: {
            currentDay: localCurrentDay,
            emailsOnCurrentDay: localEmailsOnCurrentDay,
            remainingOnCurrentDay: localRemainingOnCurrentDay,
            currentDayStart: localCurrentDayStart,
            currentDayEnd: localCurrentDayEnd,
            firstEmailTimeOnDay0: localFirstEmailTimeOnDay0,
          },
        };
      }
    }
    
    return {
      created: createdEmails.length,
      skipped,
      errors,
      emails: createdEmails,
      jobs: jobsToQueue,
      updatedState: {
        currentDay: localCurrentDay,
        emailsOnCurrentDay: localEmailsOnCurrentDay,
        remainingOnCurrentDay: localRemainingOnCurrentDay,
        currentDayStart: localCurrentDayStart,
        currentDayEnd: localCurrentDayEnd,
        firstEmailTimeOnDay0: localFirstEmailTimeOnDay0,
      },
    };
  }

  /**
   * Load contacts in batches to avoid loading all contacts into memory (OPTIMIZATION: Issue #2)
   * Returns an async generator that yields batches of contacts
   */
  private async *loadContactsInBatches(
    contactListId: string,
    batchSize: number = 1000,
    filter?: (contact: Contact) => boolean,
  ): AsyncGenerator<Contact[], void, unknown> {
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      const contactMembers = await this.contactListMemberModel.findAll({
        where: { contactListId },
        include: [
          {
            model: this.contactModel,
            as: 'contact',
            required: true,
          },
        ],
        limit: batchSize,
        offset,
        order: [['contactId', 'ASC']],
      });
      
      const contacts = contactMembers
        .map(member => member.contact)
        .filter(contact => 
          contact != null && 
          contact.subscribed !== false && 
          contact.status !== 'BOUNCED' && // Exclude globally bounced contacts only
          (!filter || filter(contact))
        ) as Contact[];
      
      if (contacts.length > 0) {
        yield contacts;
      }
      
      hasMore = contactMembers.length === batchSize;
      offset += batchSize;
      
      // Log progress for large lists
      if (offset % (batchSize * 10) === 0) {
        this.logger.debug(`Loaded ${offset} contacts from contact list ${contactListId}`);
      }
    }
  }

  /**
   * Process a single new step for an active campaign
   */
  async processNewStep(job: Job): Promise<any> {
    this.logger.log(`📨 Processing new step job ${job.id}`);
    const { campaignId, stepId, organizationId, triggeredBy } = job.data;
    this.logger.log(
      `📋 New step job details: campaignId=${campaignId}, stepId=${stepId}, ` +
      `organizationId=${organizationId}, triggeredBy=${triggeredBy}, ` +
      `jobDelay=${job.opts?.delay ? `${Math.round(job.opts.delay / 1000 / 60)} minutes` : 'none'}`
    );

    try {
      // 1. Load campaign with the specific step
      this.logger.log(`🔍 Loading campaign ${campaignId} with step ${stepId}`);
      const campaign = await this.campaignModel.findByPk(campaignId, {
        include: [
          {
            model: this.campaignStepModel,
            as: 'steps',
            where: { id: stepId },
            required: true,
          },
        ],
      });

      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      if (!campaign.steps || campaign.steps.length === 0) {
        throw new Error(`Step ${stepId} not found in campaign ${campaignId}`);
      }

      // Check campaign status before processing - prevent processing paused/completed campaigns
      if (campaign.status !== 'ACTIVE') {
        this.logger.warn(
          `⚠️ Campaign ${campaignId} is ${campaign.status}, cannot process step ${stepId}. Skipping.`
        );
        throw new Error(`Campaign ${campaignId} is ${campaign.status}, cannot process`);
      }

      const step = campaign.steps[0]; // Should be only one step
      this.logger.log(
        `✅ Loaded step: id=${step.id}, order=${step.stepOrder}, ` +
        `triggerType=${step.triggerType}, scheduleTime=${step.scheduleTime ? new Date(step.scheduleTime).toISOString() : 'none'}`
      );

      // Validate step has a template
      if (!step.templateId) {
        throw new Error(`Step ${stepId} has no template assigned`);
      }

      // For SCHEDULE steps, log the schedule time and current time
      if (step.triggerType === 'SCHEDULE' && step.scheduleTime) {
        const scheduleTime = new Date(step.scheduleTime);
        const now = new Date();
        const timeDiff = scheduleTime.getTime() - now.getTime();
        
        this.logger.log(
          `⏰ SCHEDULED STEP DETECTED: ` +
          `scheduleTime=${scheduleTime.toISOString()}, ` +
          `currentTime=${now.toISOString()}, ` +
          `timeDifference=${timeDiff > 0 ? `${Math.round(timeDiff / 1000 / 60)} minutes in future` : `${Math.round(Math.abs(timeDiff) / 1000 / 60)} minutes in past`}`
        );
        
        if (scheduleTime > now) {
          const hoursUntilSchedule = Math.round(timeDiff / (1000 * 60 * 60));
          this.logger.log(
            `📅 Step ${stepId} scheduled for ${scheduleTime.toISOString()} (${hoursUntilSchedule}h in future). ` +
            `Job is processing now (delay already expired or job was queued to process at this time). ` +
            `Will calculate send times based on scheduleTime.`
          );
        } else {
          this.logger.log(
            `⏰ Step ${stepId} was scheduled for ${scheduleTime.toISOString()} (in past). ` +
            `Processing immediately and using current time for send times.`
          );
        }
      } else if (step.triggerType === 'IMMEDIATE') {
        this.logger.log(`⚡ IMMEDIATE STEP: Processing now, using current time for send times.`);
      }

      // Use campaign's organizationId if not provided in job data
      const finalOrganizationId = organizationId || campaign.organizationId;

      // Get quota distribution from campaign sequenceSettings if available
      // BUT: We'll recalculate dynamically for each step to account for already-scheduled emails
      const storedQuotaDistribution = campaign.sequenceSettings?.quotaDistribution || null;
      
      // Get total steps count for calculating global email index
      const allSteps = await this.campaignStepModel.findAll({
        where: { campaignId },
        order: [['stepOrder', 'ASC']],
      });
      const totalSteps = allSteps.length;
      
      // Calculate how many emails were already scheduled by previous steps (OPTIMIZATION: Issue #5)
      // Use aggregated query instead of loop to avoid N queries
      let emailsFromPreviousSteps = 0;
      if (step.stepOrder > 1) {
        // Get all previous step IDs
        const previousStepIds = allSteps
          .filter(s => s.stepOrder < step.stepOrder)
          .map(s => s.id);
        
        if (previousStepIds.length > 0) {
          // Single aggregated query instead of N queries (OPTIMIZATION: Issue #5)
          const emailCounts = await this.emailMessageModel.findAll({
            where: {
              campaignId,
              campaignStepId: { [Op.in]: previousStepIds },
            },
            attributes: [
              'campaignStepId',
              [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
            ],
            group: ['campaignStepId'],
            raw: true,
          });
          
          // Sum up all counts
          emailsFromPreviousSteps = emailCounts.reduce((sum: number, row: any) => {
            return sum + (parseInt(row.count) || 0);
          }, 0);
          
          this.logger.debug(
            `📊 Previous steps emails count: ${emailsFromPreviousSteps} ` +
            `(from ${previousStepIds.length} step(s) before step ${step.stepOrder}, using aggregated query)`
          );
        }
      }

      // 2. Check if contact list has at least one subscribed, non-bounced contact (early validation)
      const subscribedCount = await this.contactListMemberModel.count({
        where: { contactListId: campaign.contactListId },
        include: [
          {
            model: this.contactModel,
            as: 'contact',
            where: { 
              subscribed: true,
              status: { [Op.not]: 'BOUNCED' }, // Exclude bounced contacts
            },
            required: true,
          },
        ],
      });

      if (subscribedCount === 0) {
        throw new Error(`No subscribed contacts found in contact list ${campaign.contactListId}. Cannot process step ${stepId}.`);
      }

      this.logger.debug(`Contact list ${campaign.contactListId} has ${subscribedCount} subscribed, non-bounced contact(s)`);

      // Get userId early for quota distribution calculation
      const userId = campaign.createdBy;

      // DYNAMIC QUOTA DISTRIBUTION: Recalculate for this step based on ACTUAL remaining quota
      // This accounts for emails already scheduled by previous steps
      // getRemainingQuotaForDays will automatically account for scheduled emails from previous steps
      let quotaDistribution: Array<{ day: number; startIndex: number; endIndex: number; quotaUsed: number }> | null = null;
      
      if (!step.replyToStepId) {
        // Calculate quota distribution dynamically for this step
        // This uses getRemainingQuotaForDays which queries actual scheduled emails from database
        // So it will automatically account for Step 1's emails when calculating Step 2's distribution
        const quotaStats = await this.rateLimiterService.getQuotaStats(userId);
        // Get dynamic daily limit from subscription plan
        const DAILY_LIMIT = await this.quotaManagementService.getDailyEmailLimit(userId);
        const remainingQuota = quotaStats.remaining;
        const emailsForThisStep = subscribedCount;
        
        this.logger.log(
          `📊 Calculating dynamic quota distribution for step ${step.stepOrder}: ` +
          `${emailsForThisStep} emails, remaining quota: ${remainingQuota}, ` +
          `previous steps emails: ${emailsFromPreviousSteps}`
        );
        
        // Calculate dynamic quota distribution for THIS step only
        // getRemainingQuotaForDays will account for emails already scheduled by previous steps
        // Get timezone from step
        const timezone = step.timezone || 'UTC';
        this.logger.log(`Using timezone: ${timezone} for step ${step.stepOrder}`);

        // For scheduled campaigns, determine which day the scheduleTime falls on
        let startDay: number | undefined = undefined;
        if (step.triggerType === 'SCHEDULE' && step.scheduleTime) {
          const scheduleTime = new Date(step.scheduleTime);
          // Use the same helper logic as in CampaignSchedulingService
          const todayStart = getMidnightInTimezone(0, timezone);
          
          // Find which day the scheduleTime falls on
          for (let day = 0; day <= MAX_SCHEDULE_DAYS; day++) {
            const dayStart = getMidnightInTimezone(day, timezone);
            const dayEnd = getMidnightInTimezone(day + 1, timezone);
            
            if (scheduleTime >= dayStart && scheduleTime < dayEnd) {
              startDay = day;
              this.logger.log(
                `📅 Scheduled step ${step.stepOrder}: scheduleTime=${scheduleTime.toISOString()}, startDay=${startDay}`
              );
              break;
            }
          }
          
          if (startDay === undefined) {
            // If scheduleTime is in the past, use day 0
            if (scheduleTime < todayStart) {
              startDay = 0;
              this.logger.warn(
                `⚠️ Schedule time ${scheduleTime.toISOString()} is in the past, using day 0`
              );
            } else {
              // Beyond MAX_SCHEDULE_DAYS, use MAX_SCHEDULE_DAYS
              startDay = MAX_SCHEDULE_DAYS;
              this.logger.warn(
                `⚠️ Schedule time ${scheduleTime.toISOString()} is beyond ${MAX_SCHEDULE_DAYS} days, using day ${MAX_SCHEDULE_DAYS}`
              );
            }
          }
        }

        quotaDistribution = await this.campaignSchedulingService.calculateQuotaDistribution(
          userId,
          emailsForThisStep,
          remainingQuota,
          DAILY_LIMIT,
          timezone,
          startDay,
        );
        
        // Adjust indices to be global (accounting for previous steps)
        const adjustedDistribution = quotaDistribution.map(dist => ({
          day: dist.day,
          startIndex: dist.startIndex + emailsFromPreviousSteps,
          endIndex: dist.endIndex + emailsFromPreviousSteps,
          quotaUsed: dist.quotaUsed,
        }));
        
        quotaDistribution = adjustedDistribution;
        
        this.logger.log(
          `✅ Dynamic quota distribution for step ${step.stepOrder}: ` +
          `${quotaDistribution.length} day(s), ${emailsForThisStep} emails, ` +
          `global indices: ${emailsFromPreviousSteps} to ${emailsFromPreviousSteps + emailsForThisStep - 1}, ` +
          `distribution: ${JSON.stringify(quotaDistribution.map(d => ({ day: d.day, range: `${d.startIndex}-${d.endIndex}`, quota: d.quotaUsed })))}`
        );
      }

      // 3. Determine contact filtering for reply-to-step (if applicable)
      let contactFilter: ((contact: Contact) => boolean) | undefined;
      let eligibleContactIds: string[] | undefined;
      
      if (step.replyToStepId && step.replyType) {
        // Filter contacts based on reply-to-step configuration
        this.logger.log(`Step ${stepId} configured to reply to step ${step.replyToStepId} (type: ${step.replyType})`);
        
        if (step.replyType === 'CLICKED') {
          // Only send to contacts who clicked BUT did NOT reply
          const clickedEmails = await this.emailMessageModel.findAll({
            where: {
              campaignId: campaign.id,
              campaignStepId: step.replyToStepId,
              clickedCount: { [Op.gt]: 0 },
            },
            attributes: ['contactId'],
            group: ['contactId'],
          });
          
          const clickedContactIds = clickedEmails.map((email: any) => email.contactId);
          
          if (clickedContactIds.length === 0) {
            this.logger.warn(`No contacts clicked in step ${step.replyToStepId}, skipping step ${stepId}`);
            return {
              success: true,
              campaignId,
              stepId,
              queuedEmails: 0,
              totalContacts: 0,
              message: 'No contacts clicked in the previous step, skipping',
            };
          }
          
          // Exclude contacts who replied
          const repliedEmails = await this.emailMessageModel.findAll({
            where: {
              campaignId: campaign.id,
              campaignStepId: step.replyToStepId,
              replyCount: { [Op.gt]: 0 },
            },
            attributes: ['contactId'],
            group: ['contactId'],
          });
          
          const repliedContactIds = repliedEmails.map((email: any) => email.contactId);
          
          eligibleContactIds = clickedContactIds.filter(id => !repliedContactIds.includes(id));
          
          if (eligibleContactIds.length === 0) {
            this.logger.warn(`No eligible contacts for CLICKED filter (all clicked contacts also replied), skipping step ${stepId}`);
            return {
              success: true,
              campaignId,
              stepId,
              queuedEmails: 0,
              totalContacts: 0,
              message: 'No eligible contacts for CLICKED filter, skipping',
            };
          }
          
          contactFilter = (contact: Contact) => eligibleContactIds!.includes(contact.id);
        } else if (step.replyType === 'OPENED') {
          // Only send to contacts who opened BUT did NOT click AND did NOT reply
          const openedEmails = await this.emailMessageModel.findAll({
            where: {
              campaignId: campaign.id,
              campaignStepId: step.replyToStepId,
              openedAt: { [Op.ne]: null },
            },
            attributes: ['contactId'],
            group: ['contactId'],
          });
          
          const openedContactIds = openedEmails.map((email: any) => email.contactId);
          
          if (openedContactIds.length === 0) {
            this.logger.warn(`No contacts opened emails in step ${step.replyToStepId}, skipping step ${stepId}`);
            return {
              success: true,
              campaignId,
              stepId,
              queuedEmails: 0,
              totalContacts: 0,
              message: 'No contacts opened emails in the previous step, skipping',
            };
          }
          
          // Exclude contacts who clicked
          const clickedEmails = await this.emailMessageModel.findAll({
            where: {
              campaignId: campaign.id,
              campaignStepId: step.replyToStepId,
              clickedCount: { [Op.gt]: 0 },
            },
            attributes: ['contactId'],
            group: ['contactId'],
          });
          
          const clickedContactIds = clickedEmails.map((email: any) => email.contactId);
          
          // Exclude contacts who replied
          const repliedEmails = await this.emailMessageModel.findAll({
            where: {
              campaignId: campaign.id,
              campaignStepId: step.replyToStepId,
              replyCount: { [Op.gt]: 0 },
            },
            attributes: ['contactId'],
            group: ['contactId'],
          });
          
          const repliedContactIds = repliedEmails.map((email: any) => email.contactId);
          
          eligibleContactIds = openedContactIds.filter(
            id => !clickedContactIds.includes(id) && !repliedContactIds.includes(id)
          );
          
          if (eligibleContactIds.length === 0) {
            this.logger.warn(`No eligible contacts for OPENED filter (all opened contacts also clicked or replied), skipping step ${stepId}`);
            return {
              success: true,
              campaignId,
              stepId,
              queuedEmails: 0,
              totalContacts: 0,
              message: 'No eligible contacts for OPENED filter, skipping',
            };
          }
          
          contactFilter = (contact: Contact) => eligibleContactIds!.includes(contact.id);
        }
      }

      this.logger.log(`Processing new step ${stepId} using batch contact loading${step.replyToStepId ? ` (filtered by reply-to-step ${step.replyToStepId})` : ''}`);

      // 4. Get sender email from Gmail token (userId already declared above)
      const token = await this.gmailTokenModel.findOne({
        where: { userId, status: 'ACTIVE' },
      });

      if (!token) {
        throw new Error(`No active Gmail token found for user ${userId}`);
      }

      const senderEmail = token.email;
      if (!senderEmail) {
        throw new Error(`Gmail token email is missing for user ${userId}`);
      }

      // 5. Check if emails for this step have already been created (avoid duplicates)
      const existingEmails = await this.emailMessageModel.count({
        where: {
          campaignId: campaign.id,
          campaignStepId: step.id,
        },
      });

      if (existingEmails > 0) {
        const remainingContacts = subscribedCount - existingEmails;
        this.logger.warn(
          `⚠️ Emails already exist for step ${stepId}: ${existingEmails} emails found. ` +
          `Total contacts: ${subscribedCount}, Remaining to schedule: ${remainingContacts > 0 ? remainingContacts : 0}`
        );
        
        if (remainingContacts === 0) {
          return {
            success: true,
            campaignId,
            stepId,
            queuedEmails: 0,
            totalContacts: subscribedCount,
            message: 'Emails already exist for this step, skipped',
          };
        }
        
        this.logger.log(`📧 Continuing to schedule ${remainingContacts} remaining emails for step ${stepId}`);
      }

      let queuedCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      // 6. Process each contact for this step
      // Use quota distribution if available (same as processFullCampaign), otherwise fall back to dynamic scheduling
      
      // Get user's daily quota limit for fallback
      const quotaStats = await this.rateLimiterService.getQuotaStats(userId);
      const dailyLimit = quotaStats.limit;
      
      // Track scheduling state (for fallback when quotaDistribution is not available)
      let emailsScheduled = 0;
      let currentDay = 0;
      let emailsOnCurrentDay = 0;
      let currentDayStart: Date;
      let currentDayEnd: Date;
      let firstEmailTimeOnDay0: Date | null = null; // Track first email time on day 0 for time continuation
      
      // Get timezone from step
      const timezone = step.timezone || 'UTC';

      // Calculate initial day boundaries (for fallback)
      const getDayBoundaries = (dayOffset: number): { start: Date; end: Date } => {
        const dayStart = getMidnightInTimezone(dayOffset, timezone);
        const dayEnd = getMidnightInTimezone(dayOffset + 1, timezone);
        return { start: dayStart, end: dayEnd };
      };
      
      // Initialize first day (for fallback)
      const firstDayBounds = getDayBoundaries(0);
      currentDayStart = firstDayBounds.start;
      currentDayEnd = firstDayBounds.end;
      
      // Get already queued emails for first day (for fallback)
      const queuedForFirstDay = await this.emailSenderQueue.countQueuedEmailsForDay(
        userId,
        currentDayStart,
        currentDayEnd,
      );
      
      // Calculate remaining quota for first day (for fallback)
      const sentToday = quotaStats.used;
      const remainingToday = Math.max(0, dailyLimit - sentToday - queuedForFirstDay);
      
      let remainingOnCurrentDay = remainingToday;
      
      // Check if we should use quota distribution
      const useQuotaDistribution = quotaDistribution && !step.replyToStepId;
      
      // Pre-calculate last scheduled email time from previous steps for each day in distribution
      // This ensures new steps start after the last step's last email time (similar to resume)
      let lastScheduledTimeByDayFromPreviousSteps = new Map<number, Date>();
      const firstEmailTimeByDay = new Map<number, Date>();
      
      if (useQuotaDistribution && step.stepOrder > 1) {
        // Use optimized batch query instead of per-day queries (OPTIMIZATION: Issue #5)
        const maxDay = quotaDistribution.length > 0 
          ? Math.max(...quotaDistribution.map((d: { day: number }) => d.day))
          : 30;
        lastScheduledTimeByDayFromPreviousSteps = await this.campaignSchedulingService.getLastScheduledTimeByDay(
          campaignId,
          step.stepOrder,
          maxDay,
        );
      }
      
      if (useQuotaDistribution) {
        this.logger.log(
          `📅 Using quota distribution for step ${stepId}: ${quotaDistribution.length} days, ` +
          `Total contacts per step: ${subscribedCount}, Step order: ${step.stepOrder}`
        );
      } else {
        this.logger.log(
          `📅 Dynamic quota scheduling for step ${stepId} (no quota distribution): ` +
          `Daily limit: ${dailyLimit}, Sent today: ${sentToday}, ` +
          `Queued for today: ${queuedForFirstDay}, Remaining today: ${remainingOnCurrentDay}`
        );
      }
      
      // Load template once before processing contacts (OPTIMIZATION: Issue #8)
      const template = await this.emailTemplateModel.findByPk(step.templateId);
      if (!template) {
        this.logger.error(`Template ${step.templateId} not found for step ${step.id}`);
        throw new Error(`Template ${step.templateId} not found for step ${step.id}`);
      }
      
      // Process contacts in batches using batch loading (OPTIMIZATION: Issue #2 & #6)
      const CONTACT_BATCH_SIZE = 1000; // Load 1000 contacts at a time from database
      const PROCESSING_BATCH_SIZE = 500; // Process 500 contacts at a time for email creation
      const PARALLEL_BATCHES = 3; // Process 3 batches in parallel (OPTIMIZATION: Issue #3)
      let totalQueuedCount = 0;
      let totalSkippedCount = 0;
      let totalErrorCount = 0;
      let allJobsToQueue: Array<{
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
      
      // Track state across batches
      let batchState = {
        currentDay,
        emailsOnCurrentDay,
        remainingOnCurrentDay,
        currentDayStart,
        currentDayEnd,
        firstEmailTimeOnDay0,
      };
      
      // Track global contact index across all contact batches
      let globalContactIndex = 0;
      // Check for contacts that bounced or unsubscribed in ANY step of this campaign (to exclude them)
      let excludedContactIds: Set<string> | null = null;
      
      // Get all steps in the campaign except the current one
      const allCampaignSteps = await this.campaignStepModel.findAll({
        where: {
          campaignId,
        },
        attributes: ['id'],
      });

      if (allCampaignSteps.length > 0) {
        // Get all step IDs except the current step being processed
        const otherStepIds = allCampaignSteps
          .filter(s => s.id !== stepId)
          .map(s => s.id);

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

          // Combine both sets
          excludedContactIds = new Set([
            ...bouncedContactIds,
            ...unsubscribedContactIds,
          ]);

          if (excludedContactIds.size > 0) {
            this.logger.log(
              `⚠️ Excluding ${excludedContactIds.size} contact(s) from step ${step.stepOrder}: ` +
              `${bouncedContactIds.size} bounced, ${unsubscribedContactIds.size} unsubscribed ` +
              `(from any step in campaign).`
            );
          }
        }
      }

      let contactBatchNumber = 0;
      
      // Load and process contacts in batches (OPTIMIZATION: Issue #2)
      for await (const contactBatch of this.loadContactsInBatches(
        campaign.contactListId,
        CONTACT_BATCH_SIZE,
        contactFilter,
      )) {
        contactBatchNumber++;
        this.logger.log(
          `📥 Loaded contact batch ${contactBatchNumber} (${contactBatch.length} contacts)`
        );
        
        // Filter contacts if reply-to-step is configured
        let filteredContacts = contactBatch;
        if (contactFilter) {
          filteredContacts = contactBatch.filter(contactFilter);
        }

        // Exclude contacts who bounced or unsubscribed in previous steps
        if (excludedContactIds && excludedContactIds.size > 0) {
          const initialCount = filteredContacts.length;
          filteredContacts = filteredContacts.filter(
            (contact) => !excludedContactIds!.has(contact.id),
          );
          const excludedCount = initialCount - filteredContacts.length;
          if (excludedCount > 0) {
            this.logger.log(
              `📧 Batch ${contactBatchNumber}: Excluded ${excludedCount} contact(s) (${initialCount} → ${filteredContacts.length}) ` +
              `who bounced or unsubscribed in previous steps`
            );
          }
        }
        
        if (filteredContacts.length === 0) {
          this.logger.debug(`No eligible contacts in batch ${contactBatchNumber}, skipping`);
          continue;
        }
        
        // Bulk check for existing emails for this contact batch (OPTIMIZATION: Issue #1)
        const contactIds = filteredContacts.map(c => c.id);
        const existingEmails = await this.emailMessageModel.findAll({
          where: {
            campaignId: campaign.id,
            campaignStepId: step.id,
            contactId: { [Op.in]: contactIds },
          },
          attributes: ['id', 'contactId'],
        });
        const existingEmailMap = new Map<string, EmailMessage>();
        existingEmails.forEach(email => {
          existingEmailMap.set(email.contactId, email);
        });
        
        // Process this contact batch in smaller processing batches (sequential to maintain state)
        for (let batchStart = 0; batchStart < filteredContacts.length; batchStart += PROCESSING_BATCH_SIZE) {
          const batchEnd = Math.min(batchStart + PROCESSING_BATCH_SIZE, filteredContacts.length);
          const processingBatch = filteredContacts.slice(batchStart, batchEnd);
          const processingBatchNumber = Math.floor(batchStart / PROCESSING_BATCH_SIZE) + 1;
          const totalProcessingBatches = Math.ceil(filteredContacts.length / PROCESSING_BATCH_SIZE);
          
          this.logger.log(
            `📦 Processing batch ${processingBatchNumber}/${totalProcessingBatches} of contact batch ${contactBatchNumber} ` +
            `(contacts ${globalContactIndex + 1}-${globalContactIndex + processingBatch.length} total)`
          );
          
          try {
            const batchResult = await this.processContactBatch(
              processingBatch,
              globalContactIndex, // Global contact index start
              campaign,
              step,
              template,
              senderEmail,
              userId,
              finalOrganizationId,
              existingEmailMap,
              useQuotaDistribution,
              quotaDistribution,
              emailsFromPreviousSteps,
              lastScheduledTimeByDayFromPreviousSteps,
              firstEmailTimeByDay,
              batchState.currentDay,
              batchState.emailsOnCurrentDay,
              batchState.remainingOnCurrentDay,
              batchState.currentDayStart,
              batchState.currentDayEnd,
              batchState.firstEmailTimeOnDay0,
              dailyLimit,
              getDayBoundaries,
            );
            
            totalQueuedCount += batchResult.created;
            totalSkippedCount += batchResult.skipped;
            totalErrorCount += batchResult.errors;
            allJobsToQueue.push(...batchResult.jobs);
            
            // Update state for next batch
            batchState = batchResult.updatedState;
            globalContactIndex += processingBatch.length;
            
            this.logger.log(
              `✅ Processing batch ${processingBatchNumber}/${totalProcessingBatches} completed: ` +
              `Created ${batchResult.created}, Skipped ${batchResult.skipped}, Errors ${batchResult.errors}`
            );
          } catch (batchError) {
            totalErrorCount += processingBatch.length;
            globalContactIndex += processingBatch.length;
            this.logger.error(
              `❌ Error processing batch ${processingBatchNumber}/${totalProcessingBatches}: ${batchError}`,
            );
          }
        }
      }
      
      // Batch queue all jobs at once (OPTIMIZATION: Issue #6)
      if (allJobsToQueue.length > 0) {
        this.logger.log(`📤 Batch queueing ${allJobsToQueue.length} email jobs`);
        const queueResult = await this.emailSenderQueue.addEmailJobs(allJobsToQueue);
        this.logger.log(
          `✅ Queued ${queueResult.queued} email jobs, ${queueResult.errors} errors`
        );
      }
      
      queuedCount = totalQueuedCount;
      skippedCount = totalSkippedCount;
      errorCount = totalErrorCount;
      
      // Batch processing complete (OPTIMIZATION: Issue #6)

      const totalProcessed = queuedCount + skippedCount + errorCount;
      const totalContactsProcessed = globalContactIndex;
      
      // Count actual emails created for this step (total expected)
      const totalEmailsCreated = await this.emailMessageModel.count({
        where: {
          campaignId,
          campaignStepId: step.id,
        },
      });

      this.logger.log(
        `✅ New step ${stepId} processing completed. ` +
        `Queued: ${queuedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}, ` +
        `Total contacts processed: ${totalContactsProcessed}, ` +
        `Total emails created: ${totalEmailsCreated}`
      );

      // Update step metrics - note: emailsSent should only count actually sent emails
      // For now, we track queued emails separately. The actual sent count is updated by email-sender processor
      try {
        // Count queued emails for this step
        const queuedEmailsCount = await this.emailMessageModel.count({
          where: {
            campaignId,
            campaignStepId: step.id,
            status: EmailMessageStatus.QUEUED,
          },
        });

        // Note: emailsSent is updated by email-sender processor when emails are actually sent
        // We only update if there are no existing emails (initial step processing)
        if (totalEmailsCreated === queuedCount) {
          // This is initial processing - step metrics will be updated as emails are sent
          this.logger.debug(
            `Step ${stepId}: ${totalEmailsCreated} emails created. ` +
            `Metrics will be updated as emails are sent.`
          );
        }
      } catch (updateError) {
        this.logger.warn(`Failed to check step metrics for step ${stepId}:`, updateError);
      }

      this.logger.log(
        `✅ STEP PROCESSING COMPLETE: Step ${stepId} (triggerType: ${step.triggerType}, ` +
        `scheduleTime: ${step.scheduleTime ? new Date(step.scheduleTime).toISOString() : 'none'}) - ` +
        `Queued: ${queuedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}, ` +
        `Total contacts: ${globalContactIndex}, Total emails created: ${totalEmailsCreated}`
      );

      return {
        success: true,
        campaignId,
        stepId,
        queuedEmails: queuedCount,
        skippedEmails: skippedCount,
        totalContacts: globalContactIndex,
        errorCount,
        message: 'New step emails queued successfully',
      };
    } catch (error) {
      this.logger.error(
        `❌ ERROR processing step ${stepId}: ${error instanceof Error ? error.message : error}`
      );
      this.logger.error(
        `New step job ${job.id} failed:`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  /**
   * Check if a step is completed (all emails are SENT or DELIVERED, no QUEUED or SENDING)
   */
  private async isStepCompleted(stepId: string): Promise<boolean> {
    try {
      // Count total emails that should be sent for this step
      const totalExpected = await this.emailMessageModel.count({
        where: { campaignStepId: stepId }
      });
      
      if (totalExpected === 0) {
        this.logger.debug(`Step ${stepId} has no emails, not considered completed`);
        return false;
      }
      
      // Count emails that are SENT or DELIVERED
      const completed = await this.emailMessageModel.count({
        where: {
          campaignStepId: stepId,
          status: { [Op.in]: ['SENT', 'DELIVERED'] }
        }
      });
      
      // Check no QUEUED or SENDING emails remain
      const pending = await this.emailMessageModel.count({
        where: {
          campaignStepId: stepId,
          status: { [Op.in]: ['QUEUED', 'SENDING'] }
        }
      });
      
      const isCompleted = completed === totalExpected && pending === 0;
      
      if (isCompleted) {
        this.logger.debug(`Step ${stepId} is completed: ${completed}/${totalExpected} emails sent/delivered, ${pending} pending`);
      } else {
        this.logger.debug(`Step ${stepId} is not completed: ${completed}/${totalExpected} emails sent/delivered, ${pending} pending`);
      }
      
      return isCompleted;
    } catch (error) {
      this.logger.error(`Error checking step completion for ${stepId}:`, error);
      return false;
    }
  }

  /**
   * Process a full campaign (original logic)
   */
  async processFullCampaign(job: Job): Promise<any> {
    this.logger.log(`🚀 Processing full campaign job ${job.id}`);
    const { campaignId, organizationId, triggeredBy } = job.data;
    this.logger.debug(`Job data: campaignId=${campaignId}, organizationId=${organizationId}, triggeredBy=${triggeredBy}`);

    try {
      // 1. Load campaign with steps
      const campaign = await this.campaignModel.findByPk(campaignId, {
        include: [
          {
            model: this.campaignStepModel,
            as: 'steps',
            required: false,
          },
        ],
      });

      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      this.logger.debug(`Campaign loaded: organizationId=${campaign.organizationId}, contactListId=${campaign.contactListId}, steps=${campaign.steps?.length || 0}`);

      if (!campaign.steps || campaign.steps.length === 0) {
        throw new Error(`Campaign ${campaignId} has no steps`);
      }

      // Check campaign status before processing - prevent processing paused/completed campaigns
      if (campaign.status !== 'ACTIVE') {
        this.logger.warn(
          `Campaign ${campaignId} is ${campaign.status}, cannot process. Skipping.`
        );
        throw new Error(`Campaign ${campaignId} is ${campaign.status}, cannot process`);
      }
      
      // Use campaign's organizationId if not provided in job data
      const finalOrganizationId = organizationId || campaign.organizationId;
      this.logger.debug(`Using organizationId: ${finalOrganizationId} (from job: ${organizationId}, from campaign: ${campaign.organizationId})`);

      // Sort steps by order
      const steps = campaign.steps.sort((a, b) => a.stepOrder - b.stepOrder);

      // Get quota distribution from campaign sequenceSettings if available
      const quotaDistribution = campaign.sequenceSettings?.quotaDistribution || null;
      if (quotaDistribution) {
        this.logger.log(`Quota distribution found for campaign ${campaignId}: ${quotaDistribution.length} days`);
      }

      // 2. Check if contact list has at least one subscribed, non-bounced contact (early validation)
      const subscribedCount = await this.contactListMemberModel.count({
        where: { contactListId: campaign.contactListId },
        include: [
          {
            model: this.contactModel,
            as: 'contact',
            where: { 
              subscribed: true,
              status: { [Op.not]: 'BOUNCED' }, // Exclude bounced contacts
            },
            required: true,
          },
        ],
      });

      if (subscribedCount === 0) {
        throw new Error(`No subscribed contacts found in contact list ${campaign.contactListId}. Cannot process campaign ${campaignId}.`);
      }

      this.logger.debug(`Contact list ${campaign.contactListId} has ${subscribedCount} subscribed, non-bounced contact(s)`);

      // 3. Load contacts from contact list
      const contactMembers = await this.contactListMemberModel.findAll({
        where: { contactListId: campaign.contactListId },
        include: [
          {
            model: this.contactModel,
            as: 'contact',
            required: true,
          },
        ],
      });

      const contacts = contactMembers
        .map(member => member.contact)
        .filter(contact => 
          contact != null && 
          contact.subscribed !== false && 
          contact.status !== 'BOUNCED' // Filter out unsubscribed AND bounced contacts
        );

      if (contacts.length === 0) {
        throw new Error(`No subscribed contacts found in contact list ${campaign.contactListId}`);
      }

      const filteredCount = contactMembers.length - contacts.length;
      this.logger.log(
        `Loaded ${contacts.length} subscribed, non-bounced contacts ` +
        `(filtered out ${filteredCount}: unsubscribed and/or bounced)`
      );

      // Calculate total emails - note: steps with replyToStepId may have fewer contacts
      // This is an estimate; actual count depends on filtering per step
      const totalEmails = contacts.length * steps.length;

      // 3. Emit initial progress
      this.emitProgressThrottled(campaignId, {
        stage: 'preparing',
        campaignId,
        totalEmails,
        queuedEmails: 0,
        sentEmails: 0,
        deliveredEmails: 0,
        failedEmails: 0,
        percentage: 0,
        currentStep: 0,
        totalSteps: steps.length,
        timestamp: new Date(),
      }, true);

      // 4. Campaign status stays ACTIVE while processing

      // 5. Get the user who created the campaign for rate limiting
      const userId = campaign.createdBy;
      this.logger.debug(`Looking for Gmail token for user: ${userId}`);

      // 6. Get sender email from Gmail token (once before the loops)
      const token = await this.gmailTokenModel.findOne({
        where: { userId, status: 'ACTIVE' },
      });

      if (!token) {
        this.logger.error(`No active Gmail token found for user ${userId}`);
        throw new Error(`No active Gmail token found for user ${userId}`);
      }

      const senderEmail = token.email; // Use the Gmail account email
      this.logger.log(`Found Gmail token with email: ${senderEmail}`);
      
      if (!senderEmail) {
        this.logger.error(`Gmail token found but email is NULL/empty for user ${userId}`);
        throw new Error(`Gmail token email is missing for user ${userId}`);
      }

      let queuedCount = 0;

      // 7. Process each step
      for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
        const step = steps[stepIndex];

        // Determine which contacts to process for this step
        let stepContacts: Contact[] = contacts;
        
        if (step.replyToStepId && step.replyType) {
          // Filter contacts based on reply-to-step configuration
          this.logger.log(`Step ${step.id} configured to reply to step ${step.replyToStepId} (type: ${step.replyType})`);
          
        if (step.replyType === 'CLICKED') {
            // Only send to contacts who clicked BUT did NOT reply
            // First, get contacts who clicked
            const clickedEmails = await this.emailMessageModel.findAll({
              where: {
                campaignId: campaign.id,
                campaignStepId: step.replyToStepId,
                clickedCount: { [Op.gt]: 0 },
              },
              attributes: ['contactId'],
              group: ['contactId'],
            });
            
            const clickedContactIds = clickedEmails.map((email: any) => email.contactId);
            
            if (clickedContactIds.length === 0) {
              this.logger.warn(`No contacts clicked in step ${step.replyToStepId}, skipping step ${step.id}`);
              continue; // Skip this step
            }
            
            // Now exclude contacts who replied (higher engagement)
            const repliedEmails = await this.emailMessageModel.findAll({
              where: {
                campaignId: campaign.id,
                campaignStepId: step.replyToStepId,
                replyCount: { [Op.gt]: 0 },
              },
              attributes: ['contactId'],
              group: ['contactId'],
            });
            
            const repliedContactIds = repliedEmails.map((email: any) => email.contactId);
            
            // Filter to contacts who clicked BUT did NOT reply
            stepContacts = contacts.filter(contact => 
              clickedContactIds.includes(contact.id) &&
              !repliedContactIds.includes(contact.id) &&
              contact.subscribed !== false &&
              contact.status !== 'BOUNCED'
            );
            
            if (stepContacts.length === 0) {
              this.logger.warn(`No eligible contacts found for CLICKED filter (all clicked contacts also replied), skipping step ${step.id}`);
              continue;
            }
          } else if (step.replyType === 'OPENED') {
            // Only send to contacts who opened BUT did NOT click AND did NOT reply
            // First, get contacts who opened
            const openedEmails = await this.emailMessageModel.findAll({
              where: {
                campaignId: campaign.id,
                campaignStepId: step.replyToStepId,
                openedAt: { [Op.ne]: null },
              },
              attributes: ['contactId'],
              group: ['contactId'],
            });
            
            const openedContactIds = openedEmails.map((email: any) => email.contactId);
            
            if (openedContactIds.length === 0) {
              this.logger.warn(`No contacts opened emails in step ${step.replyToStepId}, skipping step ${step.id}`);
              continue; // Skip this step
            }
            
            // Now exclude contacts who clicked
            const clickedEmails = await this.emailMessageModel.findAll({
              where: {
                campaignId: campaign.id,
                campaignStepId: step.replyToStepId,
                clickedCount: { [Op.gt]: 0 },
              },
              attributes: ['contactId'],
              group: ['contactId'],
            });
            
            const clickedContactIds = clickedEmails.map((email: any) => email.contactId);
            
            // And exclude contacts who replied
            const repliedEmails = await this.emailMessageModel.findAll({
              where: {
                campaignId: campaign.id,
                campaignStepId: step.replyToStepId,
                replyCount: { [Op.gt]: 0 },
              },
              attributes: ['contactId'],
              group: ['contactId'],
            });
            
            const repliedContactIds = repliedEmails.map((email: any) => email.contactId);
            
            // Filter to contacts who opened BUT did NOT click or reply
            stepContacts = contacts.filter(contact => 
              openedContactIds.includes(contact.id) &&
              !clickedContactIds.includes(contact.id) &&
              !repliedContactIds.includes(contact.id) &&
              contact.subscribed !== false &&
              contact.status !== 'BOUNCED'
            );
            
            if (stepContacts.length === 0) {
              this.logger.warn(`No eligible contacts found for OPENED filter (all opened contacts also clicked or replied), skipping step ${step.id}`);
              continue;
            }
          }
          
          if (stepContacts.length === 0) {
            this.logger.warn(`No eligible contacts found for step ${step.id} (reply-to-step: ${step.replyToStepId}), skipping`);
            continue; // Skip this step
          }
          
          this.logger.log(`Step ${step.id} will process ${stepContacts.length} contacts (filtered by reply-to-step ${step.replyToStepId})`);
        }

        // Load template once before processing contacts for this step (OPTIMIZATION: Issue #8)
        const template = await this.emailTemplateModel.findByPk(step.templateId);
        if (!template) {
          this.logger.warn(`Template ${step.templateId} not found for step ${step.id}`);
          continue; // Skip this step if template not found
        }
        
        // Bulk check for existing emails to avoid N+1 queries (OPTIMIZATION: Issue #1)
        const stepContactIds = stepContacts.map(c => c.id);
        const existingEmailsForStep = await this.emailMessageModel.findAll({
          where: {
            campaignId: campaign.id,
            campaignStepId: step.id,
            contactId: { [Op.in]: stepContactIds },
          },
          attributes: ['id', 'contactId'],
        });
        const existingEmailMapForStep = new Map<string, EmailMessage>();
        existingEmailsForStep.forEach(email => {
          existingEmailMapForStep.set(email.contactId, email);
        });

        // 8. Process each contact for this step
        for (let contactIndex = 0; contactIndex < stepContacts.length; contactIndex++) {
          const contact = stepContacts[contactIndex];

          // Calculate send time based on contact index
          // Use quota distribution for normal steps (not reply steps, as contacts might be filtered)
          let globalEmailIndex: number | undefined;
          let effectiveQuotaDistribution: typeof quotaDistribution = null;
          
          if (quotaDistribution && !step.replyToStepId) {
            // Calculate global email index: (stepOrder - 1) * totalContactsPerStep + originalContactIndex
            // Find original contact index in full contacts array
            const originalContactIndex = contacts.findIndex(c => c.id === contact.id);
            if (originalContactIndex >= 0) {
              globalEmailIndex = (step.stepOrder - 1) * subscribedCount + originalContactIndex;
              effectiveQuotaDistribution = quotaDistribution;
            }
          }
          
          // Find which day this email belongs to
          const dayDistribution = effectiveQuotaDistribution?.find(
            (d: { day: number; startIndex: number; endIndex: number }) =>
              globalEmailIndex >= d.startIndex && globalEmailIndex <= d.endIndex
          );
          
          let sendAt: Date;
          if (dayDistribution) {
            // Use unified scheduling service to calculate send time
            sendAt = this.campaignSchedulingService.calculateSendTime(
              step,
              globalEmailIndex,
              dayDistribution,
              contactIndex,
              undefined, // lastScheduledTimeByDay - not needed for full campaign processing
              undefined, // firstEmailTimeByDay - not needed for full campaign processing
              new Date(),
            );
          } else {
            // Fallback: use simple delay
            const delayMinutes = step.delayMinutes || 1;
            const baseTime = step.triggerType === 'SCHEDULE' && step.scheduleTime
              ? new Date(step.scheduleTime)
              : new Date();
            sendAt = new Date(baseTime.getTime() + contactIndex * delayMinutes * 60 * 1000);
          }

          // Template already loaded before loop (OPTIMIZATION: Issue #8)
          // Personalize content
          const personalized = this.emailPersonalizationService.personalizeContent(
            template.subject,
            template.htmlContent,
            template.textContent || '',
            contact,
          );

          // Check if email message already exists (using pre-loaded map)
          const existingEmail = existingEmailMapForStep.get(contact.id);

          if (existingEmail) {
            this.logger.debug(
              `Email already exists for contact ${contact.id}, step ${step.id}, skipping creation`
            );
            continue; // Skip this contact-step combination
          }

          // Create email_messages record
          this.logger.debug(`Creating email message for contact ${contact.id}, step ${step.id}`);
          this.logger.debug(`Data: subject="${personalized.subject}", sentFromEmail="${senderEmail}"`);
          this.logger.debug(`Full data: organizationId=${finalOrganizationId}, campaignId=${campaign.id}, campaignStepId=${step.id}, contactId=${contact.id}`);
          
          let emailMessage;
          try {
            emailMessage = await this.emailMessageModel.create({
              organizationId: finalOrganizationId,
              campaignId: campaign.id,
              campaignStepId: step.id,
              contactId: contact.id,
              subject: personalized.subject,
              htmlContent: personalized.html,
              textContent: personalized.text,
              status: EmailMessageStatus.QUEUED,
              queuedAt: new Date(),
              scheduledSendAt: sendAt, // Store when the email is scheduled to be sent
              sentFromEmail: senderEmail, // Use the actual Gmail account email
              createdBy: userId, // Store the user who created the campaign (and thus the email)
            });
            
            this.logger.debug(`✅ Email message created successfully: ${emailMessage.id}`);
          } catch (createError: any) {
            this.logger.error(`❌ Failed to create email message. Error: ${createError.message}`);
            if (createError.parent) {
              this.logger.error(`SQL Error Code: ${createError.parent.code}`);
              this.logger.error(`SQL Error Message: ${createError.parent.message}`);
              this.logger.error(`SQL: ${createError.parent.sql}`);
              this.logger.error(`Parameters: ${JSON.stringify(createError.parent.parameters)}`);
            }
            throw createError;
          }

          // Queue email to sender queue
          const stepName = step.name || `Step ${step.stepOrder}`;
          await this.emailSenderQueue.addEmailJob(
            emailMessage.id,
            campaign.id,
            step.id,
            contact.id,
            organizationId,
            userId,
            sendAt,
            campaign.name,
            stepName,
            template.sendFormat, // Pass template sendFormat for tracking injection
          );

          queuedCount++;

          // Emit progress periodically
          if (queuedCount % 10 === 0 || queuedCount === totalEmails) {
            const percentage = (queuedCount / totalEmails) * 100;
            await job.updateProgress(percentage);

            this.emitProgressThrottled(campaignId, {
              stage: 'preparing',
              campaignId,
              totalEmails,
              queuedEmails: queuedCount,
              sentEmails: 0,
              deliveredEmails: 0,
              failedEmails: 0,
              percentage,
              currentStep: stepIndex + 1,
              totalSteps: steps.length,
              timestamp: new Date(),
            });
          }
        }
      }

      // 7. Emit completion
      this.emitProgressThrottled(campaignId, {
        stage: 'sending',
        campaignId,
        totalEmails,
        queuedEmails: totalEmails,
        sentEmails: 0,
        deliveredEmails: 0,
        failedEmails: 0,
        percentage: 100,
        currentStep: steps.length,
        totalSteps: steps.length,
        timestamp: new Date(),
      }, true);

      this.logger.log(`Campaign ${campaignId} processing completed. Queued ${queuedCount} emails.`);

      return {
        success: true,
        campaignId,
        queuedEmails: queuedCount,
        totalContacts: contacts.length,
        totalSteps: steps.length,
        message: 'Campaign emails queued successfully',
      };
    } catch (error) {
      this.logger.error(
        `Campaign job ${job.id} failed:`,
        error instanceof Error ? error.stack : error,
      );

      // Emit failure event
      this.emitProgressThrottled(job.data.campaignId, {
        stage: 'failed',
        campaignId: job.data.campaignId,
        totalEmails: 0,
        queuedEmails: 0,
        sentEmails: 0,
        deliveredEmails: 0,
        failedEmails: 0,
        percentage: 0,
        currentStep: 0,
        totalSteps: 0,
        timestamp: new Date(),
        error: (error as Error).message,
      }, true);

      throw error; // Let Bull handle retries
    }
  }

  /**
   * OLD METHOD - REMOVED: calculateSendTime
   * 
   * This method has been replaced by CampaignSchedulingService.calculateSendTime
   * which provides unified scheduling logic for all scenarios.
   * 
   * The old method is kept for reference but should not be used.
   * All scheduling now goes through CampaignSchedulingService.
   */
  private calculateSendTime_OLD_DO_NOT_USE(
    step: CampaignStep,
    contactIndex: number,
    globalEmailIndex?: number,
    quotaDistribution?: Array<{ day: number; startIndex: number; endIndex: number; quotaUsed: number }>,
    lastScheduledTimeByDayFromPreviousSteps?: Map<number, Date>,
    firstEmailTimeByDay?: Map<number, Date>,
  ): Date {
    // Get timezone from step (default to UTC)
    const timezone = step.timezone || 'UTC';
    
    // Determine base start time for this step
    let baseTime: Date;
    
    if (step.triggerType === 'SCHEDULE' && step.scheduleTime) {
      // SCHEDULE: Start at the specified schedule time
      baseTime = new Date(step.scheduleTime);
    } else {
      // IMMEDIATE: Start right now
      baseTime = new Date();
    }

    // If quota distribution provided and global email index available, use quota-aware scheduling
    if (quotaDistribution && globalEmailIndex !== undefined) {
      // Find which day this email belongs to based on global email index
      const dayDistribution = quotaDistribution.find(
        d => globalEmailIndex >= d.startIndex && globalEmailIndex <= d.endIndex
      );

      if (dayDistribution) {
        // Calculate base time for the target day in step timezone
        const targetDayBaseTime = getMidnightInTimezone(dayDistribution.day, timezone);
        const now = new Date();
        
        // For new days: Always start from 12:01 AM (midnight + 1 minute)
        const targetDayBaseTimeWithOffset = new Date(targetDayBaseTime.getTime() + 60 * 1000); // +1 minute = 12:01 AM

        // Calculate within-day delay based on email's position within the day
        const emailIndexWithinDay = globalEmailIndex - dayDistribution.startIndex;
        const delayMinutes = step.delayMinutes || 1;
        
        // Determine effective base time:
        // - If this is the first email on this day AND we have a lastScheduledTimeOnThisDay from previous steps,
        //   start after the previous step's last email on this day
        // - For day 0: Use current time for first email, then continue from there
        // - For future days: Always start from 12:01 AM (midnight + 1 minute)
        let effectiveBaseTime: Date;
        const isFirstEmailOnDay = emailIndexWithinDay === 0;
        
        // Look up the last scheduled time from previous steps for this specific day
        const lastScheduledTimeOnThisDay = lastScheduledTimeByDayFromPreviousSteps?.get(dayDistribution.day) || null;
        
        this.logger.debug(
          `📅 Calculating send time for email ${globalEmailIndex}: ` +
          `emailIndexWithinDay=${emailIndexWithinDay}, ` +
          `dayDistribution.day=${dayDistribution.day}, ` +
          `lastScheduledTimeOnThisDay=${lastScheduledTimeOnThisDay ? lastScheduledTimeOnThisDay.toISOString() : 'null'}, ` +
          `isFirstEmailOnDay=${isFirstEmailOnDay}`
        );
        
        if (isFirstEmailOnDay && lastScheduledTimeOnThisDay) {
          // First email on this day - start after the previous step's last email on this day
          // Base time = last scheduled time + delayMinutes (so first email starts after it)
          effectiveBaseTime = new Date(lastScheduledTimeOnThisDay.getTime() + delayMinutes * 60 * 1000);
          // Track first email time for this day so subsequent emails continue from here
          if (firstEmailTimeByDay) {
            firstEmailTimeByDay.set(dayDistribution.day, effectiveBaseTime);
          }
          this.logger.debug(
            `📅 First email on day ${dayDistribution.day}: Using last scheduled time ${lastScheduledTimeOnThisDay.toISOString()} ` +
            `+ ${delayMinutes} min as base = ${effectiveBaseTime.toISOString()}`
          );
        } else if (!isFirstEmailOnDay && firstEmailTimeByDay) {
          // Subsequent emails on any day: Continue from first email time for this day
          const firstEmailTime = firstEmailTimeByDay.get(dayDistribution.day);
          if (firstEmailTime) {
            effectiveBaseTime = firstEmailTime;
            this.logger.debug(
              `📅 Email ${globalEmailIndex} on day ${dayDistribution.day}: Continuing from first email time ${effectiveBaseTime.toISOString()}`
            );
          } else {
            // First email time not found - this shouldn't happen, but handle gracefully
            this.logger.warn(
              `⚠️ Email ${globalEmailIndex} on day ${dayDistribution.day}: First email time not found in tracking map. ` +
              `Using 12:01 AM as fallback.`
            );
            if (dayDistribution.day === 0) {
              // Fallback for day 0: Use current time or step schedule time
              effectiveBaseTime = baseTime > now ? baseTime : now;
              if (firstEmailTimeByDay) {
                firstEmailTimeByDay.set(0, effectiveBaseTime);
              }
            } else {
              // Fallback for future days: Use 12:01 AM
              effectiveBaseTime = targetDayBaseTimeWithOffset;
              if (firstEmailTimeByDay) {
                firstEmailTimeByDay.set(dayDistribution.day, effectiveBaseTime);
              }
            }
            this.logger.debug(
              `📅 Email ${globalEmailIndex} on day ${dayDistribution.day}: Using fallback time ${effectiveBaseTime.toISOString()}`
            );
          }
        } else if (dayDistribution.day === 0 && isFirstEmailOnDay) {
          // First email on day 0 (today): Use current time or step schedule time
          effectiveBaseTime = baseTime > now ? baseTime : now;
          // Track first email time for day 0
          if (firstEmailTimeByDay) {
            firstEmailTimeByDay.set(0, effectiveBaseTime);
          }
          this.logger.debug(
            `📅 First email on day 0: Using ${effectiveBaseTime.toISOString()} as base (current time or schedule time)`
          );
        } else {
          // Use the day's 12:01 AM as the base (for future days, first email)
          effectiveBaseTime = targetDayBaseTimeWithOffset;
          // Use the later of: step schedule time or target day base time
          if (baseTime > effectiveBaseTime) {
            effectiveBaseTime = baseTime;
          }
          // Track first email time for this day
          if (firstEmailTimeByDay) {
            firstEmailTimeByDay.set(dayDistribution.day, effectiveBaseTime);
          }
          this.logger.debug(
            `📅 Email on day ${dayDistribution.day}: Using ${effectiveBaseTime.toISOString()} as base`
          );
        }

        const totalDelayMs = emailIndexWithinDay * delayMinutes * 60 * 1000;
        const finalSendTime = new Date(effectiveBaseTime.getTime() + totalDelayMs);
        
        // Debug logging for quota distribution scheduling
        const moment = require('moment-timezone');
        const sendTimeTZ = moment.utc(finalSendTime).tz(timezone);
        this.logger.debug(
          `📅 Quota-aware scheduling: Email ${globalEmailIndex} → Day ${dayDistribution.day} (${timezone}) ` +
          `(index ${dayDistribution.startIndex}-${dayDistribution.endIndex}, ` +
          `within-day: ${emailIndexWithinDay}, ` +
          `baseTime: ${effectiveBaseTime.toISOString()}, ` +
          `delay: ${totalDelayMs}ms (${emailIndexWithinDay} * ${delayMinutes}min), ` +
          `sendAt UTC: ${finalSendTime.toISOString()}, ` +
          `sendAt ${timezone}: ${sendTimeTZ.format('DD MMM YYYY HH:mm:ss z')})`
        );
        
        return finalSendTime;
      } else {
        // Log if quota distribution exists but no day found for this email index
        this.logger.warn(
          `⚠️ Quota distribution exists but no day found for email index ${globalEmailIndex}. ` +
          `Distribution: ${JSON.stringify(quotaDistribution.map(d => ({ day: d.day, range: `${d.startIndex}-${d.endIndex}` })))}. ` +
          `Falling back to normal scheduling.`
        );
      }
    }

    // Fallback to original logic (no quota distribution or no global email index)
    // Add cumulative delay based on contact index
    // contactIndex 0 = no delay, 1 = 1x delay, 2 = 2x delay, etc.
    const delayMinutes = step.delayMinutes || 1;
    const totalDelayMs = contactIndex * delayMinutes * 60 * 1000;

    return new Date(baseTime.getTime() + totalDelayMs);
  }

  /**
   * Emit progress with throttling (max once per 500ms)
   * DISABLED: Progress emission temporarily disabled
   */
  private emitProgressThrottled(
    campaignId: string,
    progress: any,
    force: boolean = false,
  ): void {
    // Progress emission disabled
    return;
    
    /* DISABLED CODE - Uncomment to re-enable progress emission
    const now = Date.now();

    const shouldEmit =
      force ||
      progress.stage === 'completed' ||
      progress.stage === 'failed' ||
      progress.stage === 'sending' ||
      (now - this.lastEmitTime) >= this.throttleInterval;

    if (shouldEmit) {
      this.wsGateway.emitCampaignProgress(campaignId, progress);
      this.lastEmitTime = now;
    }
    */
  }
}

