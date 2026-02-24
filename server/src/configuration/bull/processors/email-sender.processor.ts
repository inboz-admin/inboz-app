import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/sequelize';
import { google } from 'googleapis';
import { Campaign } from 'src/resources/campaigns/entities/campaign.entity';
import { CampaignStep } from 'src/resources/campaigns/entities/campaign-step.entity';
import {
  EmailMessage,
  EmailMessageStatus,
  BounceType,
} from 'src/resources/campaigns/entities/email-message.entity';
import { GmailOAuthToken } from 'src/resources/users/entities/gmail-oauth-token.entity';
import { User } from 'src/resources/users/entities/user.entity';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import { EmailSendFormat } from 'src/resources/email-templates/enums/email-send-format.enum';
import { Op } from 'sequelize';
import { GmailService } from 'src/common/services/gmail.service';
import { RateLimiterService } from 'src/common/services/rate-limiter.service';
import { CryptoUtilityService } from 'src/common/services/crypto-utility.service';
import { EmailTrackingService } from 'src/common/services/email-tracking.service';
import { WsGateway } from 'src/resources/ws/ws.gateway';
import { ConfigService } from '@nestjs/config';
import { CampaignProcessorQueue } from '../queues/campaign-processor.queue';
import { EmailSenderQueue } from '../queues/email-sender.queue';
import { QueueName } from '../enums/queue.enum';
import { NotificationEventService } from 'src/resources/notifications/services/notification-event.service';
import { Inject, forwardRef } from '@nestjs/common';

/**
 * BullMQ Processor for Email Sending
 * Sends individual emails via Gmail API with rate limiting
 */
@Processor(QueueName.EMAIL_SENDER)
export class EmailSenderProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailSenderProcessor.name);
  private lastEmitTime = 0;
  private readonly throttleInterval = 500; // 500ms

  constructor(
    @InjectModel(EmailMessage)
    private readonly emailMessageModel: typeof EmailMessage,
    @InjectModel(CampaignStep)
    private readonly campaignStepModel: typeof CampaignStep,
    @InjectModel(Campaign)
    private readonly campaignModel: typeof Campaign,
    @InjectModel(GmailOAuthToken)
    private readonly gmailTokenModel: typeof GmailOAuthToken,
    @InjectModel(User)
    private readonly userModel: typeof User,
    @InjectModel(Contact)
    private readonly contactModel: typeof Contact,
    private readonly gmailService: GmailService,
    private readonly rateLimiterService: RateLimiterService,
    private readonly cryptoUtilityService: CryptoUtilityService,
    private readonly emailTrackingService: EmailTrackingService,
    private readonly wsGateway: WsGateway,
    private readonly configService: ConfigService,
    private readonly campaignProcessorQueue: CampaignProcessorQueue,
    private readonly emailSenderQueue: EmailSenderQueue,
    @Inject(forwardRef(() => NotificationEventService))
    private readonly notificationEventService?: NotificationEventService,
  ) {
    super();
    this.logger.log('EmailSenderProcessor initialized');
  }

  async process(job: Job): Promise<any> {
    const {
      emailMessageId,
      campaignId,
      campaignStepId,
      contactId,
      organizationId,
      userId,
    } = job.data;

    this.logger.debug(`📧 Processing email job ${job.id} for message ${emailMessageId}`);

    try {
      // 1. Check campaign status FIRST (before rate limit and other checks)
      // This prevents sending emails for paused/completed campaigns immediately
      this.logger.log(`🔍 [FETCH] Fetching campaign by ID: ${campaignId}`);
      const campaign = await this.campaignModel.findByPk(campaignId);
      this.logger.log(`🔍 [FETCH] Campaign fetched: ${campaign ? `Found (status: ${campaign.status})` : 'Not found'}`);

      if (campaign && campaign.status !== 'ACTIVE') {
        this.logger.warn(
          `Campaign ${campaignId} is ${campaign.status}, cancelling email ${emailMessageId}`
        );
        // Load email message to update its status
        this.logger.log(`🔍 [FETCH] Fetching email message by ID: ${emailMessageId}`);
        const emailMessage = await this.emailMessageModel.findByPk(emailMessageId);
        this.logger.log(`🔍 [FETCH] Email message fetched: ${emailMessage ? `Found (status: ${emailMessage.status})` : 'Not found'}`);

        if (emailMessage && emailMessage.status !== EmailMessageStatus.CANCELLED) {
          await emailMessage.update({ status: EmailMessageStatus.CANCELLED });
        }
        return { success: false, reason: `Campaign is ${campaign.status}` };
      }

      // 2. Check rate limit
      const canSend = await this.rateLimiterService.checkQuota(userId);
      if (!canSend) {
        // Smart quota-exceeded handling: Reschedule job instead of throwing error
        try {
          // Get original send time from job data
          const originalSendTime = job.data.sendAt
            ? new Date(job.data.sendAt)
            : new Date();

          // Get quota reset time
          const quotaStats = await this.rateLimiterService.getQuotaStats(userId);
          const quotaResetTime = quotaStats.resetAt;

          // Calculate reschedule time: max of (original time, quota reset) + 1 hour buffer
          const now = new Date();
          const bufferMs = 60 * 60 * 1000; // 1 hour buffer

          let rescheduleTime: Date;
          if (originalSendTime > quotaResetTime) {
            // Original time is in future, after quota reset - use original time + buffer
            rescheduleTime = new Date(originalSendTime.getTime() + bufferMs);
          } else {
            // Quota reset happens before or at original time - use quota reset + buffer
            rescheduleTime = new Date(quotaResetTime.getTime() + bufferMs);
          }

          // Ensure reschedule time is in future
          if (rescheduleTime <= now) {
            rescheduleTime = new Date(now.getTime() + bufferMs);
          }

          const delayMs = rescheduleTime.getTime() - now.getTime();

          // Reschedule job
          await this.emailSenderQueue.rescheduleEmailJob(emailMessageId, delayMs);

          // Update email record
          const emailMessage = await this.emailMessageModel.findByPk(emailMessageId);
          if (emailMessage) {
            await emailMessage.update({
              nextRetryAt: rescheduleTime,
              errorCode: 'QUOTA_EXCEEDED_RESCHEDULED',
              errorMessage: `Quota exceeded. Rescheduled to ${rescheduleTime.toISOString()}`,
            });
          }

          this.logger.log(
            `Quota exceeded for user ${userId}. Rescheduled email ${emailMessageId} ` +
            `from ${originalSendTime.toISOString()} to ${rescheduleTime.toISOString()} ` +
            `(delay: ${Math.round(delayMs / 1000)}s)`
          );

          // Return success (don't throw - prevents retry exhaustion)
          return {
            success: true,
            rescheduled: true,
            emailMessageId,
            originalSendTime: originalSendTime.toISOString(),
            rescheduleTime: rescheduleTime.toISOString(),
            delayMs,
          };
        } catch (rescheduleError) {
          const err = rescheduleError as Error;
          this.logger.error(
            `Error rescheduling email ${emailMessageId} due to quota exceeded: ${err.message}`,
            err.stack,
          );
          // Fallback: throw error to let BullMQ retry (existing behavior)
          throw new Error('QUOTA_EXCEEDED: Daily email limit reached. Retrying later.');
        }
      }

      // 3. Load email message
      this.logger.log(`🔍 [FETCH] Fetching email message by ID: ${emailMessageId}`);
      const emailMessage = await this.emailMessageModel.findByPk(emailMessageId);
      this.logger.log(`🔍 [FETCH] Email message fetched: ${emailMessage ? `Found (status: ${emailMessage.status}, contactId: ${emailMessage.contactId})` : 'Not found'}`);

      if (!emailMessage) {
        throw new Error(`Email message ${emailMessageId} not found`);
      }

      // Check if already sent or cancelled
      if (
        emailMessage.status === EmailMessageStatus.SENT ||
        emailMessage.status === EmailMessageStatus.CANCELLED
      ) {
        this.logger.debug(`Email ${emailMessageId} already ${emailMessage.status}`);
        return { success: true, status: emailMessage.status };
      }

      // 3. Get Gmail OAuth token
      this.logger.log(`🔍 [FETCH] Fetching Gmail OAuth token for user: ${userId} (status: ACTIVE)`);
      const token = await this.gmailTokenModel.findOne({
        where: { userId, status: 'ACTIVE' },
      });
      this.logger.log(`🔍 [FETCH] Gmail token fetched: ${token ? `Found (email: ${token.email})` : 'Not found'}`);

      if (!token) {
        throw new Error(`No active Gmail token found for user ${userId}`);
      }

      // 4. Refresh token if expired
      let accessToken = await this.cryptoUtilityService.decrypt(
        token.accessTokenEncrypted,
      );

      if (token.tokenExpiresAt && new Date(token.tokenExpiresAt) <= new Date()) {
        this.logger.log(`Token expired for user ${userId}. Refreshing...`);

        const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

        const refreshed = await this.gmailService.refreshAccessToken(
          token.refreshTokenEncrypted,
          clientId,
          clientSecret,
        );

        accessToken = refreshed.accessToken;

        const expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
        const encryptedAccessToken = await this.cryptoUtilityService.encrypt(accessToken);

        await token.update({
          accessTokenEncrypted: encryptedAccessToken,
          tokenExpiresAt: expiresAt,
        });

        this.logger.log(`Token refreshed for user ${userId}`);
      }

      // 5. Update status to 'sending'
      await emailMessage.update({ status: EmailMessageStatus.SENDING });

      // 6. Load contact if not already loaded
      if (!emailMessage.contact) {
        this.logger.log(`🔍 [FETCH] Fetching contact by ID: ${emailMessage.contactId}`);
        emailMessage.contact = await this.contactModel.findByPk(emailMessage.contactId);
        this.logger.log(`🔍 [FETCH] Contact fetched: ${emailMessage.contact ? `Found (email: ${emailMessage.contact.email}, subscribed: ${emailMessage.contact.subscribed})` : 'Not found'}`);
      } else {
        this.logger.log(`🔍 [FETCH] Contact already loaded: ${emailMessage.contact.email} (subscribed: ${emailMessage.contact.subscribed})`);
      }

      if (!emailMessage.contact || !emailMessage.contact.email) {
        throw new Error(`Contact not found or missing email for contact ID: ${emailMessage.contactId}`);
      }

      // Check if contact has unsubscribed or is bounced - cancel email if so
      if (emailMessage.contact.subscribed === false || emailMessage.contact.status === 'BOUNCED') {
        this.logger.warn(
          `Contact ${emailMessage.contactId} is ${emailMessage.contact.subscribed === false ? 'unsubscribed' : 'bounced'}, cancelling email ${emailMessageId}`
        );
        await emailMessage.update({
          status: EmailMessageStatus.CANCELLED,
          errorMessage: `Contact is ${emailMessage.contact.subscribed === false ? 'unsubscribed' : 'bounced'}`,
        });
        return {
          success: false,
          reason: `Contact is ${emailMessage.contact.subscribed === false ? 'unsubscribed' : 'bounced'}`
        };
      }

      // 7. Use already loaded campaign to check if tracking is enabled
      const trackOpens = campaign?.openTracking ?? true;
      const trackClicks = campaign?.clickTracking ?? true;
      const addUnsubscribe = campaign?.unsubscribeTracking ?? true; // Always add unsubscribe by default
      const unsubscribeReplyEnabled = campaign?.unsubscribeReplyEnabled ?? false;
      const unsubscribeCustomMessage = campaign?.unsubscribeCustomMessage;

      // 8. Load user to get display name
      this.logger.log(`🔍 [FETCH] Fetching user by ID: ${userId}`);
      const user = await this.userModel.findByPk(userId);
      this.logger.log(`🔍 [FETCH] User fetched: ${user ? `Found (firstName: ${user.firstName || 'N/A'}, lastName: ${user.lastName || 'N/A'})` : 'Not found'}`);

      const fromName = user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`.trim()
        : user?.firstName || user?.lastName || undefined;

      // Log display name for debugging
      if (fromName) {
        this.logger.log(`📧 [FROM NAME] Using display name: "${fromName}" for user ${userId}`);
      } else {
        this.logger.warn(`📧 [FROM NAME] No display name found for user ${userId} (firstName: ${user?.firstName || 'N/A'}, lastName: ${user?.lastName || 'N/A'})`);
      }

      // 9. Get sendFormat from job data (passed from campaign processor - OPTIMIZATION: template loaded once per step)
      const sendFormat = (job.data.sendFormat as string) || EmailSendFormat.TEXT;
      let finalHtml: string | undefined = undefined;
      let finalText: string | undefined = undefined;

      if (sendFormat === EmailSendFormat.HTML) {
        // HTML format: send HTML content only
        finalHtml = emailMessage.htmlContent;
        finalText = undefined; // Don't send text content

        // Always inject tracking/unsubscribe (unsubscribe is required for compliance)
        // Even if all tracking is disabled, we still add unsubscribe link
        finalHtml = this.emailTrackingService.injectTracking(
          emailMessage.htmlContent,
          emailMessage.id,
          trackOpens,
          trackClicks,
          fromName,
          addUnsubscribe, // Always true by default, but respects campaign setting
          unsubscribeReplyEnabled,
          unsubscribeCustomMessage,
        );
        this.logger.debug(`📧 HTML injected, new length: ${finalHtml.length}, original: ${emailMessage.htmlContent.length}`);

        this.logger.debug(`📧 Using HTML format - HTML content length: ${finalHtml.length}`);
      } else {
        // TEXT format: textContent contains HTML (converted from plain text with links)
        // htmlContent may also exist (from predefined templates)
        // If HTML exists, always use it (even if tracking is disabled, HTML emails can still be tracked)
        const textHasHtml = emailMessage.textContent && /<[a-z][\s\S]*>/i.test(emailMessage.textContent);
        const htmlContent = emailMessage.htmlContent || '';
        const htmlHasContent = htmlContent && htmlContent.trim().length > 0;

        if (textHasHtml) {
          // textContent contains HTML - always inject tracking/unsubscribe (unsubscribe is required)
          finalHtml = this.emailTrackingService.injectTracking(
            emailMessage.textContent,
            emailMessage.id,
            trackOpens,
            trackClicks,
            fromName,
            addUnsubscribe, // Always true by default, but respects campaign setting
            unsubscribeReplyEnabled,
            unsubscribeCustomMessage,
          );
          finalText = undefined;
          this.logger.debug(`📧 TEXT format template using HTML from textContent - HTML length: ${finalHtml.length}, tracking: ${trackOpens || trackClicks || addUnsubscribe}`);
        } else if (htmlHasContent) {
          // htmlContent exists (from predefined template) - always inject tracking/unsubscribe
          finalHtml = this.emailTrackingService.injectTracking(
            emailMessage.htmlContent,
            emailMessage.id,
            trackOpens,
            trackClicks,
            fromName,
            addUnsubscribe, // Always true by default, but respects campaign setting
            unsubscribeReplyEnabled,
            unsubscribeCustomMessage,
          );
          finalText = undefined;
          this.logger.debug(`📧 TEXT format template using HTML from htmlContent - HTML length: ${finalHtml.length}, tracking: ${trackOpens || trackClicks || addUnsubscribe}`);
        } else {
          // Plain text in textContent - always inject unsubscribe (required for compliance)
          finalHtml = undefined;
          finalText = emailMessage.textContent || '';

          // Always inject unsubscribe, even if other tracking is disabled
          finalText = this.emailTrackingService.injectTextTracking(
            emailMessage.textContent || '',
            emailMessage.id,
            trackClicks,
            fromName,
            addUnsubscribe, // Always true by default, but respects campaign setting
            unsubscribeReplyEnabled,
            unsubscribeCustomMessage,
          );
          this.logger.debug(`📧 Text tracking injected, new length: ${finalText.length}, original: ${emailMessage.textContent?.length || 0}`);
        }
      }

      // 11. Prepare thread headers for ALL emails in the campaign sequence
      // Find all previous emails sent to this contact in this campaign to build thread
      let threadHeaders: { inReplyTo?: string; references?: string; threadId?: string } | undefined;
      let finalSubject = emailMessage.subject; // Default to template subject
      let isReplyEmail = false;
      let replyToMessageId: string | null = null; // Clean Message-ID of the email being replied to (for replyMessageId column)

      // Load the step to check if it's configured to reply to a previous step
      this.logger.log(`🔍 [FETCH] Fetching campaign step by ID: ${campaignStepId} (attributes: replyToStepId, replyType, stepOrder)`);
      const step = await this.campaignStepModel.findByPk(campaignStepId, {
        attributes: ['replyToStepId', 'replyType', 'stepOrder'],
      });
      this.logger.log(`🔍 [FETCH] Campaign step fetched: ${step ? `Found (stepOrder: ${step.stepOrder}, replyToStepId: ${step.replyToStepId || 'null'}, replyType: ${step.replyType || 'null'})` : 'Not found'}`);

      // Find all previous emails for this contact in this campaign
      this.logger.log(`🔍 [FETCH] Fetching previous emails (campaignId: ${campaignId}, contactId: ${emailMessage.contactId}, status: SENT/DELIVERED)`);
      const previousEmails = await this.emailMessageModel.findAll({
        where: {
          campaignId,
          contactId: emailMessage.contactId,
          status: { [Op.in]: ['SENT', 'DELIVERED'] },
        },
        include: [
          {
            model: this.campaignStepModel,
            as: 'campaignStep',
            attributes: ['stepOrder', 'id'],
            required: true,
          },
        ],
        order: [['sentAt', 'ASC']], // Oldest first to build proper chain
      });
      this.logger.log(`🔍 [FETCH] Previous emails fetched: ${previousEmails.length} emails found`);

      // Filter to only emails from steps before the current step
      const earlierEmails = previousEmails.filter((email: any) => {
        const emailStepOrder = email.campaignStep?.stepOrder ?? 999;
        const currentStepOrder = step?.stepOrder ?? 999;
        return emailStepOrder < currentStepOrder;
      });

      if (earlierEmails.length > 0 && step?.replyToStepId) {
        isReplyEmail = true;
        // Find the email from the specific step we're replying to
        const replyToEmail = earlierEmails.find((email: any) =>
          email.campaignStepId === step.replyToStepId
        );

        if (!replyToEmail) {
          this.logger.warn(
            `Email from step ${step.replyToStepId} not found for contact ${emailMessage.contactId}. Sending as new thread.`
          );
        } else if (!replyToEmail.gmailMessageId) {
          this.logger.warn(
            `Email from step ${step.replyToStepId} exists but has no gmailMessageId for contact ${emailMessage.contactId}. Email may not be sent yet. Sending as new thread.`
          );
        } else {
          // Use the email from the step we're replying to for threading
          // For Gmail, we need to use the actual Gmail threadId (not messageId)
          // The threadId should be the same for all emails in a thread
          const previousThreadId = replyToEmail.gmailThreadId || replyToEmail.gmailMessageId;

          this.logger.log(
            `🔍 [THREADING DEBUG] Found previous email for reply: ` +
            `messageId=${replyToEmail.gmailMessageId}, ` +
            `threadId=${replyToEmail.gmailThreadId}, ` +
            `will use threadId=${previousThreadId}`
          );

          if (!previousThreadId) {
            this.logger.warn(
              `No gmailThreadId or gmailMessageId found for reply email. Cannot thread.`
            );
          } else {
            // Reference: Send reply using stored threadId + cleanMessageId
            // The stored gmailMessageId is the internal ID (result.id), not the Message-ID header
            // We need to fetch the clean Message-ID header from Gmail for threading
            let cleanMessageId = replyToEmail.gmailMessageId; // This is the internal ID

            // Fetch the clean Message-ID header from the previous email for threading
            // This is critical for proper threading - we need the actual Message-ID header
            try {
              // Create OAuth2 client for fetching Message-ID
              const fetchOAuth2Client = new google.auth.OAuth2();
              fetchOAuth2Client.setCredentials({
                access_token: accessToken,
              });

              // Fetch the clean Message-ID header from the previous email
              const gmail = google.gmail({ version: 'v1', auth: fetchOAuth2Client });
              this.logger.log(`🔍 [FETCH] Fetching clean Message-ID header from previous email (internal ID: ${cleanMessageId})`);
              cleanMessageId = await this.gmailService.getRealMessageId(gmail, cleanMessageId);
              this.logger.log(`✅ [MESSAGE-ID] Fetched clean Message-ID header from previous email: ${cleanMessageId}`);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              this.logger.warn(
                `⚠️ [MESSAGE-ID] Failed to fetch clean Message-ID header from previous email: ${errorMessage}. ` +
                `Using threadId for threading. Email may not thread correctly.`
              );
              // Fallback: use threadId (Gmail will still thread by threadId, but headers won't be perfect)
              cleanMessageId = replyToEmail.gmailThreadId || replyToEmail.gmailMessageId || '';
            }

            // Store the clean Message-ID of the email being replied to (for replyMessageId column)
            replyToMessageId = cleanMessageId; // This is the clean Message-ID header of the email we're replying to

            // Reference: Wrap clean Message-ID in < > brackets when using in headers
            // In-Reply-To: <${parentMsgId}>
            // References: <${parentMsgId}>
            const inReplyTo = `<${cleanMessageId}>`;
            const references = `<${cleanMessageId}>`;

            this.logger.log(
              `📧 [MESSAGE-ID FORMAT] Using for In-Reply-To: ${inReplyTo}, References: ${references}`
            );

            // CRITICAL: Use gmailThreadId (not gmailMessageId) for threading
            // All emails in the same thread should share the same threadId
            // Reference: threadId is passed in requestBody, inReplyTo and references in headers
            // Reference code uses actual Gmail Message-ID header value directly
            threadHeaders = {
              inReplyTo: inReplyTo, // Actual Gmail Message-ID header (includes < > brackets)
              references: references, // Actual Gmail Message-ID header (includes < > brackets)
              threadId: previousThreadId, // This will be passed to Gmail API as threadId parameter in requestBody
            };

            this.logger.log(
              `🔗 [THREADING] Using threadId: ${previousThreadId} from previous email (messageId: ${replyToEmail.gmailMessageId})`
            );

            // Use first email's subject exactly as-is (no "Re: " prefix)
            // Gmail threads by subject matching, so we need the exact same subject
            // Find the first email in the thread to get the original subject
            const firstEmail = earlierEmails[0]; // First email in the thread

            this.logger.log(
              `🔍 [THREADING DEBUG] Found ${earlierEmails.length} earlier emails. First email subject: "${firstEmail?.subject || 'N/A'}", Reply-to email subject: "${replyToEmail.subject || 'N/A'}"`
            );

            if (firstEmail && firstEmail.subject) {
              // Use the exact same subject as the first email (no modifications)
              finalSubject = firstEmail.subject.trim();
              this.logger.log(
                `📧 [SUBJECT] Using first email's subject exactly as-is: "${finalSubject}"`
              );
            } else if (replyToEmail.subject) {
              // Fallback: use reply-to email's subject exactly as-is
              finalSubject = replyToEmail.subject.trim();
              this.logger.log(
                `📧 [SUBJECT] Using reply-to email's subject exactly as-is: "${finalSubject}"`
              );
            }

            this.logger.debug(
              `Setting thread headers for reply to step ${step.replyToStepId}: In-Reply-To: ${threadHeaders.inReplyTo}, References: ${references.substring(0, 100)}..., Thread-Id: ${threadHeaders.threadId}`
            );
          }
        }
      }
      // Note: Only explicit reply steps (with replyToStepId) are threaded together
      // Regular sequential steps will create new threads

      // 12. Re-check campaign status right before sending (ACID fix: prevents race condition)
      // This ensures no emails are sent if campaign was paused between initial check and send
      const campaignStatusCheck = await this.campaignModel.findByPk(campaignId, {
        attributes: ['id', 'status'],
      });

      if (!campaignStatusCheck || campaignStatusCheck.status !== 'ACTIVE') {
        this.logger.warn(
          `Campaign ${campaignId} status changed to ${campaignStatusCheck?.status || 'NOT_FOUND'} before send. Cancelling email ${emailMessageId}`
        );
        await emailMessage.update({
          status: EmailMessageStatus.CANCELLED,
          errorMessage: `Campaign status is ${campaignStatusCheck?.status || 'NOT_FOUND'}`,
        });
        return {
          success: false,
          reason: `Campaign is ${campaignStatusCheck?.status || 'NOT_FOUND'}`
        };
      }

      // 13. Send email via Gmail API
      try {
        // Log thread headers being sent
        if (threadHeaders) {
          this.logger.log(
            `📧 [THREADING] Sending email ${emailMessageId} with thread headers: ` +
            `In-Reply-To: ${threadHeaders.inReplyTo}, ` +
            `References: ${threadHeaders.references?.substring(0, 100)}..., ` +
            `Thread-Id: ${threadHeaders.threadId}`
          );
        } else {
          this.logger.log(`📧 [THREADING] Sending email ${emailMessageId} without thread headers (new thread)`);
        }

        // Log final subject before sending
        this.logger.log(
          `📧 [FINAL SUBJECT] Sending with subject: "${finalSubject}" ` +
          `(Original template subject: "${emailMessage.subject}")`
        );

        const result = await this.gmailService.sendEmail({
          accessToken,
          to: emailMessage.contact.email,
          from: token.email, // Use the Gmail account's email
          fromName, // Display name from user
          subject: finalSubject, // Use final subject (original for replies, template for new)
          html: finalHtml, // Use HTML if sendFormat is HTML, undefined otherwise
          text: finalText, // Use text if sendFormat is TEXT, undefined otherwise
          threadHeaders, // Include thread headers for threading
        });

        // Log the exact Gmail API response
        this.logger.log(
          `📧 [GMAIL RESPONSE] Email ${emailMessageId} sent successfully. ` +
          `Response: { id: "${result.id}", threadId: "${result.threadId}", ` +
          `gmailMessageId: "${result.gmailMessageId || 'N/A'}", ` +
          `labelIds: [${result.labelIds?.join(', ') || 'none'}] }`
        );

        // 14. Update status to 'sent' and store Message-IDs
        // gmailMessageId = Internal Gmail API message ID from send response (result.id)
        // replyMessageId = Clean Message-ID header fetched via getRealMessageId (if this is a reply)
        // Store threadId in gmailThreadId column

        // For reply emails, fetch the clean Message-ID header using getRealMessageId
        let replyMessageIdToStore: string | null = null;
        if (isReplyEmail && result.id) {
          try {
            // Create OAuth2 client for fetching Message-ID
            const fetchOAuth2Client = new google.auth.OAuth2();
            fetchOAuth2Client.setCredentials({
              access_token: accessToken,
            });

            // Fetch the clean Message-ID header from Gmail
            const gmail = google.gmail({ version: 'v1', auth: fetchOAuth2Client });
            this.logger.log(`🔍 [FETCH] Fetching clean Message-ID header for reply email using internal ID: ${result.id}`);
            const cleanReplyMessageId = await this.gmailService.getRealMessageId(gmail, result.id);
            replyMessageIdToStore = cleanReplyMessageId;
            this.logger.log(`📧 [REPLY MESSAGE-ID] Fetched clean Message-ID for reply: "${cleanReplyMessageId}"`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(`⚠️ [REPLY MESSAGE-ID] Failed to fetch clean Message-ID: ${errorMessage}`);
            // Fallback: use the stored replyToMessageId if available
            replyMessageIdToStore = replyToMessageId;
          }
        }

        await emailMessage.update({
          status: EmailMessageStatus.SENT,
          sentAt: new Date(),
          gmailMessageId: result.id, // Internal Gmail API message ID from send response
          gmailThreadId: result.threadId, // Thread ID - stored in gmailThreadId column
          replyMessageId: replyMessageIdToStore, // Clean Message-ID header (fetched via getRealMessageId) if this is a reply
          sentFromEmail: token.email,
        });

        this.logger.log(
          `📧 [DB UPDATE] Stored internal Message-ID in gmailMessageId column: "${result.id}", ` +
          `Thread ID in gmailThreadId column: "${result.threadId}"` +
          (replyMessageIdToStore ? `, Reply Message-ID in replyMessageId column: "${replyMessageIdToStore}"` : '')
        );

        // 15. Increment rate limit counter (after successful send)
        await this.rateLimiterService.incrementQuota(userId);

        // 16. Update step metrics
        await this.campaignStepModel.increment('emailsSent', {
          where: { id: campaignStepId },
        });

        // 17. Aggregate to campaign
        await this.aggregateStepMetricsToCampaign(campaignId);

        // 18. Check if campaign is completed (only when we just sent the LAST step's email - prevents race where S2 send marks COMPLETED before S3 sends)
        await this.checkCampaignCompletion(campaignId, campaignStepId);


        // 19. Emit progress
        await this.emitProgress(campaignId, campaignStepId);

        this.logger.debug(`✅ Email ${emailMessageId} sent successfully${threadHeaders ? ' (in thread)' : ''}`);

        // 20. Add 1-second delay between emails to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));

        return {
          success: true,
          emailMessageId,
          gmailMessageId: result.id,
          status: 'sent',
        };
      } catch (sendError) {
        // Handle permanent vs temporary errors
        const err = sendError as Error;
        const isPermanent = !this.gmailService.isTemporaryError(sendError);
        const errorCode = this.gmailService.getErrorCode(sendError);

        this.logger.error(
          `Failed to send email ${emailMessageId}: ${err.message} (${errorCode})`,
        );

        await emailMessage.update({
          status: isPermanent ? EmailMessageStatus.FAILED : EmailMessageStatus.BOUNCED,
          errorMessage: err.message,
          errorCode,
          bounceType: isPermanent ? BounceType.HARD : BounceType.SOFT,
          bouncedAt: new Date(),
        });

        if (isPermanent) {
          // Don't retry, update metrics
          await this.campaignStepModel.increment('emailsFailed', {
            where: { id: campaignStepId },
          });

          await this.aggregateStepMetricsToCampaign(campaignId);
          await this.emitProgress(campaignId, campaignStepId);

          // Don't throw error for permanent failures
          return {
            success: false,
            emailMessageId,
            status: 'failed',
            error: err.message,
          };
        } else {
          // Temporary error - let BullMQ retry
          throw sendError;
        }
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Email job ${job.id} failed:`,
        error instanceof Error ? error.stack : error,
      );

      // If quota exceeded, throw to retry later
      if (err.message && err.message.includes('QUOTA_EXCEEDED')) {
        throw error;
      }

      // For other errors, mark as failed and don't retry
      throw error;
    }
  }

  /**
   * Aggregate step metrics to campaign level
   */
  private async aggregateStepMetricsToCampaign(campaignId: string): Promise<void> {
    try {
      const steps = await this.campaignStepModel.findAll({
        where: { campaignId },
      });

      const totals = steps.reduce(
        (acc, step) => ({
          emailsSent: acc.emailsSent + (step.emailsSent || 0),
          emailsDelivered: acc.emailsDelivered + (step.emailsDelivered || 0),
          emailsOpened: acc.emailsOpened + (step.emailsOpened || 0),
          emailsClicked: acc.emailsClicked + (step.emailsClicked || 0),
          emailsBounced: acc.emailsBounced + (step.emailsBounced || 0),
          emailsFailed: acc.emailsFailed + (step.emailsFailed || 0),
        }),
        {
          emailsSent: 0,
          emailsDelivered: 0,
          emailsOpened: 0,
          emailsClicked: 0,
          emailsBounced: 0,
          emailsFailed: 0,
        },
      );

      await this.campaignModel.update(totals, {
        where: { id: campaignId },
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to aggregate metrics for campaign ${campaignId}: ${err.message}`,
      );
    }
  }

  /**
   * Check if campaign is completed and update status
   * Uses actual email_messages records for accurate completion check
   * Only counts steps that have emails (excludes newly added steps without emails yet)
   */

  private async checkCampaignCompletion(campaignId: string, stepJustSentId?: string): Promise<void> {
    try {
      this.logger.log(`🔍 [FETCH] [COMPLETION CHECK] Fetching campaign by ID: ${campaignId}`);
      const campaign = await this.campaignModel.findByPk(campaignId);
      this.logger.log(`🔍 [FETCH] [COMPLETION CHECK] Campaign fetched: ${campaign ? `Found (status: ${campaign.status})` : 'Not found'}`);

      if (!campaign || campaign.status === 'COMPLETED') {
        return; // Already completed or not found
      }

      // Get all steps for this campaign
      this.logger.log(`🔍 [FETCH] [COMPLETION CHECK] Fetching all campaign steps for campaign: ${campaignId}`);
      const steps = await this.campaignStepModel.findAll({
        where: { campaignId },
        order: [['stepOrder', 'ASC']],
      });
      this.logger.log(`🔍 [FETCH] [COMPLETION CHECK] Campaign steps fetched: ${steps.length} steps found`);

      // Only consider marking COMPLETED when the email we just sent is for the LAST step (highest stepOrder).
      // This prevents the race: S2 send runs completion check and marks COMPLETED before S3's send job runs.
      // If stepJustSentId is missing (e.g. old job), skip completion to avoid ever marking prematurely.
      if (steps.length === 0) {
        return;
      }
      if (!stepJustSentId) {
        this.logger.debug(
          `🔍 [COMPLETION CHECK] Skipping completion check: stepJustSentId not provided (safe skip)`,
        );
        return;
      }
      const lastStep = steps[steps.length - 1];
      if (lastStep.id !== stepJustSentId) {
        this.logger.debug(
          `🔍 [COMPLETION CHECK] Skipping completion check: email was for step ${stepJustSentId}, last step is ${lastStep.id} (order ${lastStep.stepOrder})`,
        );
        return;
      }

      // Count steps that have at least one email record (processor has run and created emails)
      // Do NOT count reply steps with 0 emails as "processed" - they may not have run yet (race:
      // S2 sends → we mark COMPLETED → S3's processor job runs later → S3's send job sees COMPLETED and cancels).
      let stepsProcessed = 0;
      for (const step of steps) {
        const stepEmailCount = await this.emailMessageModel.count({
          where: {
            campaignId,
            campaignStepId: step.id,
          },
        });
        if (stepEmailCount > 0) stepsProcessed++;
      }
      if (stepsProcessed === 0 || stepsProcessed < steps.length) {
        return; // Not all steps have emails yet (last step's processor may not have run)
      }

      // Use total EmailMessage count so we never mark COMPLETED while any row is still QUEUED/SENDING.
      // Summing per-step can race: if the 4th email for the last step is created after we read counts, we'd see 12 and mark, then the 4th send job would be cancelled.
      const totalExpectedEmails = await this.emailMessageModel.count({
        where: { campaignId },
      });
      if (totalExpectedEmails === 0) return;

      // Count actual processed emails from email_messages table (not aggregates)
      const processedEmails = await this.emailMessageModel.count({
        where: {
          campaignId,
          status: {
            [Op.in]: [
              EmailMessageStatus.SENT,
              EmailMessageStatus.DELIVERED,
              EmailMessageStatus.FAILED,
              EmailMessageStatus.BOUNCED,
              EmailMessageStatus.CANCELLED,
            ],
          },
        },
      });

      // Check for any remaining QUEUED emails
      const queuedEmails = await this.emailMessageModel.count({
        where: {
          campaignId,
          status: EmailMessageStatus.QUEUED,
        },
      });

      // Check for any emails currently being sent (SENDING status)
      // This prevents a race condition where an email transitions from QUEUED -> SENDING
      // and disappears from both the "processed" and "queued" counts, causing premature completion
      const sendingEmails = await this.emailMessageModel.count({
        where: {
          campaignId,
          status: EmailMessageStatus.SENDING,
        },
      });

      // Only mark as completed if:
      // 1. Every step has at least one email (no step still waiting for its processor job)
      // 2. All expected emails are in a terminal state
      // 3. No QUEUED or SENDING emails remain
      const allStepsProcessed = stepsProcessed === steps.length;
      const everyStepHasEmails = steps.length > 0 && allStepsProcessed; // allStepsProcessed already requires each step to have >0 emails

      if (
        everyStepHasEmails &&
        processedEmails >= totalExpectedEmails &&
        queuedEmails === 0 &&
        sendingEmails === 0
      ) {
        await this.campaignModel.update(
          { status: 'COMPLETED', completedAt: new Date() },
          { where: { id: campaignId } },
        );

        this.logger.log(
          `🎉 Campaign ${campaignId} marked as COMPLETED ` +
          `(${processedEmails}/${totalExpectedEmails} emails processed, ${queuedEmails} queued, ${sendingEmails} sending, ` +
          `${stepsProcessed}/${steps.length} steps processed)`
        );

        // Send notification for campaign completion
        try {
          const campaign = await this.campaignModel.findByPk(campaignId);
          if (campaign && this.notificationEventService) {
            await this.notificationEventService.notifyCampaignCompleted(campaign as any);
          }
        } catch (error) {
          this.logger.warn(`Failed to send notification for campaign completion ${campaignId}:`, error);
        }
      } else {
        this.logger.debug(
          `Campaign ${campaignId} not completed yet: ` +
          `${processedEmails}/${totalExpectedEmails} processed, ${queuedEmails} queued, ${sendingEmails} sending, ` +
          `${stepsProcessed}/${steps.length} steps processed`
        );
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to check completion for campaign ${campaignId}: ${err.message}`,
      );
    }
  }

  /**
   * Emit progress updates via WebSocket
   * DISABLED: Progress emission temporarily disabled
   */
  private async emitProgress(campaignId: string, campaignStepId: string): Promise<void> {
    // Progress emission disabled
    return;

    /* DISABLED CODE - Uncomment to re-enable progress emission
    try {
      const now = Date.now();
      const shouldEmit = (now - this.lastEmitTime) >= this.throttleInterval;

      if (!shouldEmit) {
        return;
      }

      // Get campaign data
      const campaign = await this.campaignModel.findByPk(campaignId);
      const step = await this.campaignStepModel.findByPk(campaignStepId);

      if (campaign && step) {
        // Emit campaign-level progress
        this.wsGateway.emitCampaignProgress(campaignId, {
          stage: 'sending',
          campaignId,
          totalEmails: campaign.totalRecipients * campaign.totalSteps,
          queuedEmails: 0, // TODO: Get from queue
          sentEmails: campaign.emailsSent || 0,
          deliveredEmails: campaign.emailsDelivered || 0,
          failedEmails: (campaign.emailsFailed || 0) + (campaign.emailsBounced || 0),
          percentage: campaign.totalRecipients * campaign.totalSteps > 0
            ? Math.min(100, ((campaign.emailsSent || 0) / (campaign.totalRecipients * campaign.totalSteps)) * 100)
            : 0,
          currentStep: step.stepOrder,
          totalSteps: campaign.totalSteps,
          timestamp: new Date(),
        });

        // Emit step-level progress
        this.wsGateway.emitStepProgress(campaignStepId, {
          stepId: campaignStepId,
          stepOrder: step.stepOrder,
          emailsSent: step.emailsSent || 0,
          emailsDelivered: step.emailsDelivered || 0,
          emailsOpened: step.emailsOpened || 0,
          emailsClicked: step.emailsClicked || 0,
          emailsFailed: (step.emailsFailed || 0) + (step.emailsBounced || 0),
          percentage: campaign.totalRecipients > 0
            ? Math.min(100, ((step.emailsSent || 0) / campaign.totalRecipients) * 100)
            : 0,
          timestamp: new Date(),
        });

        this.lastEmitTime = now;
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to emit progress: ${err.message}`);
    }
    */
  }
}

