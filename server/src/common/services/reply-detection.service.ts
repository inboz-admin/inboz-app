import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { GmailOAuthToken } from 'src/resources/users/entities/gmail-oauth-token.entity';
import { EmailMessage, EmailMessageStatus } from 'src/resources/campaigns/entities/email-message.entity';
import { EmailEventType, EmailTrackingEvent } from 'src/resources/campaigns/entities/email-tracking-event.entity';
import { CampaignStep } from 'src/resources/campaigns/entities/campaign-step.entity';
import { Campaign } from 'src/resources/campaigns/entities/campaign.entity';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import { GmailService } from './gmail.service';
import { CryptoUtilityService } from './crypto-utility.service';
import { EmailTrackingService } from './email-tracking.service';
import { BounceDetectionService } from './bounce-detection.service';
import { ConfigService } from '@nestjs/config';
import { TokenRefreshService } from './token-refresh.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { SchedulerHealthService } from './scheduler-health.service';
import { DetectionCacheService } from './detection-cache.service';
import { classifyGmailError, requiresTokenRefresh, requiresReAuth } from '../utils/gmail-error.util';
import { retryWithBackoff } from '../utils/retry.util';

/**
 * Reply Detection Service
 * Polls Gmail threads to detect reply emails
 * and updates EmailMessage records accordingly
 */
@Injectable()
export class ReplyDetectionService {
  private readonly logger = new Logger(ReplyDetectionService.name);

  constructor(
    @InjectModel(GmailOAuthToken)
    private readonly gmailTokenModel: typeof GmailOAuthToken,
    @InjectModel(EmailMessage)
    private readonly emailMessageModel: typeof EmailMessage,
    @InjectModel(EmailTrackingEvent)
    private readonly emailTrackingEventModel: typeof EmailTrackingEvent,
    @InjectModel(Campaign)
    private readonly campaignModel: typeof Campaign,
    private readonly gmailService: GmailService,
    private readonly cryptoUtilityService: CryptoUtilityService,
    private readonly emailTrackingService: EmailTrackingService,
    private readonly bounceDetectionService: BounceDetectionService,
    private readonly configService: ConfigService,
    private readonly tokenRefreshService: TokenRefreshService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly schedulerHealthService: SchedulerHealthService,
    private readonly detectionCacheService: DetectionCacheService,
  ) {}

  /**
   * Main method: Check all active Gmail accounts for reply emails
   */
  async checkForReplies(): Promise<{
    checked: number;
    found: number;
    processed: number;
    errors: number;
  }> {
    const schedulerName = 'ReplyDetectionService';
    this.schedulerHealthService.recordStart(schedulerName);
    const serviceStartTime = Date.now();
    this.logger.log('🔍 [ReplyDetectionService] Starting reply detection check...');

    const stats = {
      checked: 0,
      found: 0,
      processed: 0,
      errors: 0,
    };

    try {
      // Get all active Gmail tokens
      const tokens = await this.gmailTokenModel.findAll({
        where: {
          status: 'ACTIVE',
        },
      });

      this.logger.log(
        `[ReplyDetectionService] Found ${tokens.length} active Gmail account(s) to check for replies`,
      );

      // Process users in parallel batches for better scalability
      const batchSize = 10;
      const batches: typeof tokens[] = [];

      // Split tokens into batches
      for (let i = 0; i < tokens.length; i += batchSize) {
        batches.push(tokens.slice(i, i + batchSize));
      }

      if (batches.length > 0) {
        this.logger.log(
          `[ReplyDetectionService] Processing ${tokens.length} user(s) in ${batches.length} batch(es) of ${batchSize}`,
        );
      }

      // Process each batch in parallel
      for (const batch of batches) {
        const batchPromises = batch.map(async (token) => {
          try {
            // Check circuit breaker before processing
            if (await this.circuitBreakerService.isOpen(token.userId)) {
              this.logger.debug(
                `Circuit breaker is OPEN for user ${token.userId}, skipping`,
              );
              return null;
            }

            stats.checked++;

            // Get valid access token (refresh if needed)
            let accessToken: string;
            try {
              accessToken = await this.tokenRefreshService.getValidAccessToken(
                token.userId,
              );
            } catch (error) {
              const err = error as Error;
              this.logger.warn(
                `Failed to get valid access token for user ${token.userId}: ${err.message}`,
              );
              await this.circuitBreakerService.recordFailure(token.userId);
              stats.errors++;
              return null;
            }

            // Check this user's threads for replies with retry logic
            const result = await retryWithBackoff(
              () =>
                this.checkUserThreadsForReplies(
              token.userId,
              token.email,
              accessToken,
                ),
              {
                maxAttempts: 3,
                onRetry: (attempt, error) => {
                  this.logger.debug(
                    `Retrying reply check for user ${token.userId} (attempt ${attempt}): ${error.message}`,
                  );
                },
              },
              this.logger,
            );

            // Record success if we got a result
            if (result) {
              await this.circuitBreakerService.recordSuccess(token.userId);
            }

            return result;
          } catch (error) {
            const err = error as Error;
            const classified = classifyGmailError(error);

            // Record failure in circuit breaker
            await this.circuitBreakerService.recordFailure(token.userId);

            // Handle different error types
            if (requiresReAuth(error)) {
              this.logger.warn(
                `User ${token.userId} needs to re-authenticate: ${err.message}`,
              );
            } else if (requiresTokenRefresh(error)) {
              this.logger.warn(
                `Token refresh failed for user ${token.userId}: ${err.message}`,
              );
            } else {
            this.logger.error(
              `Error checking replies for user ${token.userId}: ${err.message}`,
              err.stack,
            );
            }

            stats.errors++;
            return null;
          }
        });

        // Wait for batch to complete before processing next batch
        const batchResults = await Promise.allSettled(batchPromises);

        // Aggregate results
        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value) {
            stats.found += result.value.found;
            stats.processed += result.value.processed;
          }
        }
      }

      const serviceDuration = Date.now() - serviceStartTime;
      const serviceDurationSeconds = (serviceDuration / 1000).toFixed(2);

      // Record metrics
      if (stats.errors > 0) {
        this.schedulerHealthService.recordFailure(
          schedulerName,
          serviceDuration,
          new Error(`${stats.errors} errors occurred`),
          stats,
        );
        this.logger.warn(
          `⚠️ [ReplyDetectionService] Check completed with ${stats.errors} error(s) in ${serviceDurationSeconds}s ` +
          `| Accounts: ${stats.checked} | Found: ${stats.found} | Processed: ${stats.processed} | Errors: ${stats.errors}`,
        );
      } else {
        this.schedulerHealthService.recordSuccess(schedulerName, serviceDuration, stats);
        this.logger.log(
          `✅ [ReplyDetectionService] Check completed in ${serviceDurationSeconds}s ` +
          `| Accounts: ${stats.checked} | Found: ${stats.found} | Processed: ${stats.processed}`,
        );
      }

      return stats;
    } catch (error) {
      const err = error as Error;
      const serviceDuration = Date.now() - serviceStartTime;
      this.schedulerHealthService.recordFailure(schedulerName, serviceDuration, err);
      this.logger.error(
        `Error in reply detection check: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Check a single user's Gmail threads for reply emails
   * Public method for use by queue processors
   */
  async checkUserThreadsForReplies(
    userId: string,
    userEmail: string,
    accessToken: string,
  ): Promise<{ found: number; processed: number }> {
    const stats = { found: 0, processed: 0 };

    try {
      // Get all sent emails with gmailThreadId from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const sentEmails = await this.emailMessageModel.findAll({
        where: {
          sentFromEmail: userEmail,
          status: {
            [Op.in]: [EmailMessageStatus.SENT, EmailMessageStatus.DELIVERED],
          },
          sentAt: {
            [Op.gte]: thirtyDaysAgo,
          },
          gmailThreadId: {
            [Op.ne]: null,
          },
        },
        attributes: ['id', 'gmailThreadId', 'contactId', 'sentAt'],
      });

      if (sentEmails.length === 0) {
        return stats;
      }

      this.logger.debug(
        `Checking ${sentEmails.length} threads for user ${userEmail}`,
      );

      // Get unique thread IDs
      const threadIds = [...new Set(sentEmails.map((e) => e.gmailThreadId))];

      // Check each thread for new replies
      for (const threadId of threadIds) {
        try {
          // Skip if already processed (check Redis cache)
          if (await this.detectionCacheService.isReplyProcessed(threadId)) {
            continue;
          }

          // Get thread from Gmail with retry logic
          const thread = await retryWithBackoff(
            () => this.gmailService.getThread(accessToken, threadId),
            {
              maxAttempts: 3,
              onRetry: (attempt, error) => {
                this.logger.debug(
                  `Retrying getThread for thread ${threadId} (attempt ${attempt}): ${error.message}`,
                );
              },
            },
            this.logger,
          );

          // Find original emails for this thread
          const originalEmails = sentEmails.filter(
            (e) => e.gmailThreadId === threadId,
          );

          // Check each message in thread for replies or bounces
          for (const message of thread.messages) {
            // CRITICAL: Check if this is a bounce email using multiple methods
            // 1. Check headers (From/Sender)
            // 2. Check snippet for bounce keywords
            // 3. Check subject for bounce keywords
            const isBounce = this.isBounceOrSystemEmail(message.headers) ||
              this.isBounceByContent(message.snippet || '', message.headers);
            
            if (isBounce) {
              this.logger.debug(
                `Bounce email detected in thread ${threadId} (message ${message.id}), processing as bounce...`,
              );
              
              // Process as bounce (this will find the original email and update it)
              try {
                // Convert message format for bounce processing
                const bounceMessage = {
                  id: message.id,
                  payload: message.payload,
                  headers: message.headers,
                  snippet: message.snippet || '',
                };
                
                const bounceProcessed = await this.bounceDetectionService.processBounce(
                  bounceMessage,
                  userEmail,
                );
                
                if (bounceProcessed) {
                  this.logger.log(
                    `✅ Bounce processed from thread ${threadId} (message ${message.id})`,
                  );
                  stats.processed++;
                }
              } catch (error) {
                const err = error as Error;
                this.logger.warn(
                  `Error processing bounce from thread: ${err.message}`,
                );
              }
              
              // Skip this message - don't process as reply
              continue;
            }
            
            // Check if this message is a reply
            const isReply = this.isReplyMessage(message, originalEmails);

            if (isReply.isReply) {
              stats.found++;

              // Process the reply
              const processed = await this.processReply(
                isReply.originalEmail,
                message,
                userEmail,
              );

              if (processed) {
                stats.processed++;
                  // Mark thread as processed in Redis cache (with automatic TTL)
                  await this.detectionCacheService.markReplyProcessed(threadId);
              }
            }
          }
        } catch (error) {
          const err = error as Error;
          const classified = classifyGmailError(error);

          // Handle different error types
          if (requiresReAuth(error)) {
            this.logger.warn(
              `Insufficient Gmail API scopes for thread ${threadId}. ` +
              `User ${userEmail} needs to re-authenticate to grant required permissions. ` +
              `Required scopes: gmail.readonly. Error: ${err.message}`,
            );
            // Continue to next thread instead of failing completely
            continue;
          } else if (requiresTokenRefresh(error)) {
            this.logger.warn(
              `Token refresh needed for thread ${threadId}, user ${userEmail}: ${err.message}`,
            );
            // Continue to next thread - token refresh will be attempted on next scheduler run
            continue;
          } else {
          this.logger.warn(
              `Error processing thread ${threadId} (${classified.type}): ${err.message}`,
          );
          }
        }
      }
    } catch (error) {
      const err = error as Error;
      const classified = classifyGmailError(error);

      // Handle different error types
      if (requiresReAuth(error)) {
        this.logger.warn(
          `Insufficient Gmail API scopes for user ${userEmail}. ` +
          `User needs to re-authenticate to grant required permissions. ` +
          `Required scopes: gmail.readonly. Error: ${err.message}`,
        );
        // Don't throw - just skip this user for now
        return stats;
      } else if (requiresTokenRefresh(error)) {
        this.logger.warn(
          `Token refresh needed for user ${userEmail}: ${err.message}`,
        );
        // Don't throw - token refresh will be attempted on next scheduler run
        return stats;
      }

      this.logger.error(
        `Error checking threads for user ${userEmail} (${classified.type}): ${err.message}`,
      );
      throw error;
    }

    return stats;
  }

  /**
   * Check if message is from a bounce/mailer-daemon system (not a user reply)
   */
  private isBounceOrSystemEmail(headers: Array<{ name: string; value: string }>): boolean {
    const fromHeader = this.getHeader(headers, 'From');
    const senderHeader = this.getHeader(headers, 'Sender');
    
    if (!fromHeader && !senderHeader) {
      return false;
    }
    
    const fromLower = (fromHeader || senderHeader || '').toLowerCase();
    
    // Check for bounce/mailer-daemon indicators
    const bounceIndicators = [
      'mailer-daemon',
      'mail delivery subsystem',
      'postmaster',
      'mail delivery',
      'delivery failure',
      'delivery notification',
      'undelivered',
      'returned mail',
      'mail system',
      'noreply',
      'no-reply',
      'bounce',
      'mail-delivery',
      'mailer-daemon@googlemail.com',
    ];
    
    return bounceIndicators.some(indicator => fromLower.includes(indicator));
  }

  /**
   * Check if message is a bounce by content (snippet/subject)
   */
  private isBounceByContent(snippet: string, headers: Array<{ name: string; value: string }>): boolean {
    const snippetLower = snippet.toLowerCase();
    const subject = this.getHeader(headers, 'Subject')?.toLowerCase() || '';
    const subjectLower = subject.toLowerCase();
    
    const bounceKeywords = [
      'delivery failure',
      'undeliverable',
      'address not found',
      'could not be delivered',
      'bounce',
      'mail delivery subsystem',
      'returned mail',
      'delivery status notification',
      'failure notice',
      'undelivered mail',
    ];
    
    return bounceKeywords.some(keyword => 
      snippetLower.includes(keyword) || subjectLower.includes(keyword)
    );
  }

  /**
   * Determine if a message is a reply to one of our sent emails
   */
  private isReplyMessage(
    message: {
      id: string;
      headers: Array<{ name: string; value: string }>;
      internalDate: string;
      snippet?: string;
    },
    originalEmails: Array<{
      id: string;
      sentAt: Date;
      contactId: string;
    }>,
  ): { isReply: boolean; originalEmail?: typeof originalEmails[0] } {
    const headers = message.headers;

    // CRITICAL: EXCLUDE bounce emails FIRST - bounces often have In-Reply-To headers but are NOT replies
    if (this.isBounceOrSystemEmail(headers)) {
      this.logger.debug(
        `Message ${message.id} is from bounce/system email, skipping reply detection`,
      );
      return { isReply: false };
    }

    // Additional check: Look for bounce indicators in snippet/subject using the same method as thread loop
    if (this.isBounceByContent(message.snippet || '', headers)) {
      this.logger.debug(
        `Message ${message.id} contains bounce keywords in content, skipping reply detection`,
      );
      return { isReply: false };
    }

    // Check if message has In-Reply-To or References header (indicates it's a reply)
    const inReplyTo = this.getHeader(headers, 'In-Reply-To');
    const references = this.getHeader(headers, 'References');

    if (!inReplyTo && !references) {
      return { isReply: false };
    }

    // Get message date
    const messageDate = new Date(parseInt(message.internalDate));

    // Find original email that this might be replying to
    // Check if message date is after original email was sent
    for (const originalEmail of originalEmails) {
      if (messageDate > originalEmail.sentAt) {
        // This message came after the original email
        // Check if it's from the original recipient
        const fromHeader = this.getHeader(headers, 'From');
        if (fromHeader) {
          // Verify sender is NOT a bounce/system email (double-check)
          if (this.isBounceOrSystemEmail(headers)) {
            this.logger.debug(
              `Message ${message.id} sender detected as bounce/system in secondary check`,
            );
            return { isReply: false };
          }
          // We'll verify the contact email match in processReply
          return { isReply: true, originalEmail };
        }
      }
    }

    return { isReply: false };
  }

  /**
   * Process a reply email: update EmailMessage
   */
  private async processReply(
    originalEmail: {
      id: string;
      contactId: string;
    },
    replyMessage: {
      id: string;
      headers: Array<{ name: string; value: string }>;
      snippet: string;
    },
    senderEmail: string,
  ): Promise<boolean> {
    try {
      // Reload email message with contact
      const emailMessage = await this.emailMessageModel.findByPk(
        originalEmail.id,
        {
          include: [
            {
              model: Contact,
              as: 'contact',
            },
          ],
        },
      );

      if (!emailMessage || !emailMessage.contact) {
        return false;
      }

      // CRITICAL: Skip if email is already bounced - bounces should never be counted as replies
      if (emailMessage.status === EmailMessageStatus.BOUNCED || emailMessage.bouncedAt) {
        this.logger.debug(
          `Email ${originalEmail.id} is already marked as BOUNCED, skipping reply processing`,
        );
        return false;
      }

      // DOUBLE-CHECK: Verify this is NOT a bounce/system email before processing as reply
      // This is a safety check in case the bounce check was missed earlier
      if (this.isBounceOrSystemEmail(replyMessage.headers)) {
        this.logger.warn(
          `⚠️ Bounce email detected in processReply() for email ${originalEmail.id}, skipping reply processing`,
        );
        return false;
      }

      // Verify reply is from the original recipient
      const fromHeader = this.getHeader(replyMessage.headers, 'From');
      const recipientEmail = emailMessage.contact.email.toLowerCase();

      if (!fromHeader || !fromHeader.toLowerCase().includes(recipientEmail)) {
        this.logger.debug(
          `Reply from ${fromHeader} doesn't match recipient ${recipientEmail} for email ${originalEmail.id}`,
        );
        return false;
      }

      // CRITICAL: Check for custom unsubscribe message BEFORE processing as reply
      // This check happens early to prioritize unsubscribe over reply
      if (emailMessage.campaignId) {
        const campaign = await this.campaignModel.findByPk(emailMessage.campaignId);
        
        if (campaign?.unsubscribeReplyEnabled && campaign?.unsubscribeCustomMessage) {
          const customMessage = campaign.unsubscribeCustomMessage.trim().toLowerCase();
          const replySnippet = replyMessage.snippet?.trim().toLowerCase() || '';
          
          // Check if reply contains the custom unsubscribe message (case-insensitive, partial match)
          if (replySnippet.includes(customMessage)) {
            this.logger.log(
              `🔔 Custom unsubscribe message detected in reply for email ${originalEmail.id}. Message: "${customMessage}"`,
            );
            
            // Process as unsubscribe instead of reply
            try {
              await this.emailTrackingService.handleUnsubscribe(originalEmail.id);
              this.logger.log(
                `✅ Processed unsubscribe from custom reply message for email ${originalEmail.id}`,
              );
              return true; // Return true to indicate message was processed, but don't record as reply
            } catch (error) {
              const err = error as Error;
              this.logger.error(
                `❌ Failed to process unsubscribe from custom reply: ${err.message}`,
                err.stack,
              );
              // Continue to process as normal reply if unsubscribe fails
            }
          }
        }
      }

      // CRITICAL: Check if this specific Gmail message ID has already been processed
      // This prevents counting the same reply multiple times
      // Also check if this message was processed as a BOUNCED event (bounces should never be replies)
      
      // First, reload email to get latest status (might have been marked as BOUNCED by bounce detection)
      const latestEmailMessage = await this.emailMessageModel.findByPk(originalEmail.id);
      if (latestEmailMessage && 
          (latestEmailMessage.status === EmailMessageStatus.BOUNCED || latestEmailMessage.bouncedAt)) {
        this.logger.debug(
          `Email ${originalEmail.id} is already marked as BOUNCED (latest status), skipping reply processing`,
        );
        return false;
      }
      
      // Check if this Gmail message ID was already processed as REPLIED or BOUNCED
      const existingEvent = await this.emailTrackingEventModel.findOne({
        where: {
          emailMessageId: originalEmail.id,
          eventType: {
            [Op.in]: [EmailEventType.REPLIED, EmailEventType.BOUNCED],
          },
          gmailMessageId: replyMessage.id,
        },
      });

      if (existingEvent) {
        if (existingEvent.eventType === EmailEventType.BOUNCED) {
          this.logger.warn(
            `⚠️ Gmail message ${replyMessage.id} was already processed as BOUNCED for email ${originalEmail.id}, skipping reply processing`,
          );
        } else {
          this.logger.debug(
            `Reply message ${replyMessage.id} already processed for email ${originalEmail.id}, skipping duplicate`,
          );
        }
        return false;
      }

      // Check if already replied (avoid duplicate counting)
      const currentReplyCount = emailMessage.replyCount || 0;

      // Update EmailMessage
      await emailMessage.update({
        repliedAt: emailMessage.repliedAt || new Date(), // Set on first reply
        replyCount: currentReplyCount + 1,
        lastRepliedAt: new Date(),
      });

      this.logger.log(
        `✅ Reply recorded for email ${emailMessage.id} from ${recipientEmail} (reply #${currentReplyCount + 1})`,
      );

      // Update contact reply date
      try {
        if (emailMessage.contact) {
          await emailMessage.contact.update({
            recentlyReplyDate: new Date(),
            lastContactedAt: new Date(),
          });
          this.logger.debug(
            `✅ Updated contact ${emailMessage.contact.id} recentlyReplyDate and lastContactedAt`,
          );
        }
      } catch (error) {
        const err = error as Error;
        this.logger.warn(
          `Error updating contact for reply: ${err.message}`,
        );
      }

      // Update step and campaign aggregates
      await this.updateAggregates(emailMessage);

      // Record tracking event with Gmail message ID to prevent duplicates
      await this.recordTrackingEvent(emailMessage.id, replyMessage.id, replyMessage.snippet);

      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error processing reply for email ${originalEmail.id}: ${err.message}`,
        err.stack,
      );
      return false;
    }
  }

  /**
   * Update step and campaign aggregates
   */
  private async updateAggregates(emailMessage: EmailMessage): Promise<void> {
    try {
      const campaignStepId = emailMessage.campaignStepId;
      const campaignId = emailMessage.campaignId;

      if (!campaignStepId || !campaignId) {
        this.logger.warn(
          `EmailMessage ${emailMessage.id} missing campaignStepId or campaignId`,
        );
        return;
      }

      // Update step aggregates
      const step = await CampaignStep.findByPk(campaignStepId);
      if (step) {
        await step.increment('emailsReplied');
      }

      // Update campaign aggregates
      const campaign = await Campaign.findByPk(campaignId);
      if (campaign) {
        await campaign.increment('emailsReplied');
      }

      this.logger.debug(
        `Updated aggregates for step ${campaignStepId} and campaign ${campaignId}`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error updating aggregates: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Record reply tracking event with Gmail message ID for duplicate detection
   */
  private async recordTrackingEvent(
    emailMessageId: string,
    gmailMessageId: string,
    replySnippet: string,
  ): Promise<void> {
    try {
      await this.emailTrackingService.recordEvent(
        emailMessageId,
        EmailEventType.REPLIED,
        {
          // Store Gmail message ID in eventData to prevent duplicates
          gmailMessageId,
          snippet: replySnippet.substring(0, 255),
        },
      );
    } catch (error) {
      const err = error as Error;
      this.logger.warn(
        `Error recording reply tracking event: ${err.message}`,
      );
    }
  }

  /**
   * Helper to get header value
   */
  private getHeader(
    headers: Array<{ name: string; value: string }>,
    name: string,
  ): string | null {
    const header = headers.find((h) => h.name === name);
    return header?.value || null;
  }
}

