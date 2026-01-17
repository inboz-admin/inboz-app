import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { GmailOAuthToken } from 'src/resources/users/entities/gmail-oauth-token.entity';
import { EmailMessage, EmailMessageStatus, BounceType } from 'src/resources/campaigns/entities/email-message.entity';
import { EmailTrackingEvent, EmailEventType } from 'src/resources/campaigns/entities/email-tracking-event.entity';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import { CampaignStep } from 'src/resources/campaigns/entities/campaign-step.entity';
import { Campaign } from 'src/resources/campaigns/entities/campaign.entity';
import { GmailService } from './gmail.service';
import { CryptoUtilityService } from './crypto-utility.service';
import { EmailTrackingService } from './email-tracking.service';
import { ConfigService } from '@nestjs/config';
import { TokenRefreshService } from './token-refresh.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { SchedulerHealthService } from './scheduler-health.service';
import { DetectionCacheService } from './detection-cache.service';
import { classifyGmailError, requiresTokenRefresh, requiresReAuth } from '../utils/gmail-error.util';
import { retryWithBackoff } from '../utils/retry.util';

/**
 * Bounce Detection Service
 * Polls Gmail inboxes to detect bounce notification emails
 * and updates EmailMessage records accordingly
 */
@Injectable()
export class BounceDetectionService {
  private readonly logger = new Logger(BounceDetectionService.name);

  constructor(
    @InjectModel(GmailOAuthToken)
    private readonly gmailTokenModel: typeof GmailOAuthToken,
    @InjectModel(EmailMessage)
    private readonly emailMessageModel: typeof EmailMessage,
    @InjectModel(Contact)
    private readonly contactModel: typeof Contact,
    @InjectModel(EmailTrackingEvent)
    private readonly emailTrackingEventModel: typeof EmailTrackingEvent,
    private readonly gmailService: GmailService,
    private readonly cryptoUtilityService: CryptoUtilityService,
    private readonly emailTrackingService: EmailTrackingService,
    private readonly configService: ConfigService,
    private readonly tokenRefreshService: TokenRefreshService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly schedulerHealthService: SchedulerHealthService,
    private readonly detectionCacheService: DetectionCacheService,
  ) {}

  /**
   * Main method: Check all active Gmail accounts for bounce emails
   */
  async checkForBounces(): Promise<{
    checked: number;
    found: number;
    processed: number;
    errors: number;
  }> {
    const schedulerName = 'BounceDetectionService';
    this.schedulerHealthService.recordStart(schedulerName);
    const serviceStartTime = Date.now();
    this.logger.log('🔍 [BounceDetectionService] Starting bounce detection check...');

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
        `[BounceDetectionService] Found ${tokens.length} active Gmail account(s) to check for bounces`,
      );

      // Process users in parallel batches for better scalability
      // Batch size of 10 allows processing 100 users in ~20 seconds instead of 200 seconds
      const batchSize = 10;
      const batches: typeof tokens[] = [];

      // Split tokens into batches
      for (let i = 0; i < tokens.length; i += batchSize) {
        batches.push(tokens.slice(i, i + batchSize));
      }

      if (batches.length > 0) {
        this.logger.log(
          `[BounceDetectionService] Processing ${tokens.length} user(s) in ${batches.length} batch(es) of ${batchSize}`,
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

            // Check this user's inbox for bounce emails with retry logic
            // Get token once and only refresh if auth error occurs
            let currentAccessToken = accessToken;
            let tokenRefreshed = false;
            
            const result = await retryWithBackoff(
              async () => {
                // Use current token (will be refreshed if auth error occurred)
                return await this.checkUserInboxForBounces(
                  token.userId,
                  token.email,
                  currentAccessToken,
                  token, // Pass token for History API support
                );
              },
              {
                maxAttempts: 3,
                onRetry: async (attempt, error) => {
                  this.logger.debug(
                    `Retrying bounce check for user ${token.userId} (attempt ${attempt}): ${error.message}`,
                  );
                  
                  // If auth error, refresh token before retry (only once)
                  if (requiresTokenRefresh(error) && !tokenRefreshed) {
                    this.logger.log(
                      `Auth error detected, refreshing token for user ${token.userId} before retry`,
                    );
                    try {
                      currentAccessToken = await this.tokenRefreshService.getValidAccessToken(
                        token.userId,
                        true, // Force refresh
                      );
                      tokenRefreshed = true;
                      this.logger.log(`Token refreshed successfully for user ${token.userId}`);
                    } catch (refreshError) {
                      this.logger.warn(
                        `Token refresh failed for user ${token.userId}: ${(refreshError as Error).message}`,
                      );
                    }
                  }
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
              `Error checking bounces for user ${token.userId}: ${err.message}`,
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
          `⚠️ [BounceDetectionService] Check completed with ${stats.errors} error(s) in ${serviceDurationSeconds}s ` +
          `| Accounts: ${stats.checked} | Found: ${stats.found} | Processed: ${stats.processed} | Errors: ${stats.errors}`,
        );
      } else {
        this.schedulerHealthService.recordSuccess(schedulerName, serviceDuration, stats);
        this.logger.log(
          `✅ [BounceDetectionService] Check completed in ${serviceDurationSeconds}s ` +
          `| Accounts: ${stats.checked} | Found: ${stats.found} | Processed: ${stats.processed}`,
        );
      }

      return stats;
    } catch (error) {
      const err = error as Error;
      const serviceDuration = Date.now() - serviceStartTime;
      this.schedulerHealthService.recordFailure(schedulerName, serviceDuration, err);
      this.logger.error(
        `Error in bounce detection check: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Check a single user's Gmail inbox for bounce emails
   * Public method for use by queue processors
   */
  async checkUserInboxForBounces(
    userId: string,
    userEmail: string,
    accessToken: string,
    token?: GmailOAuthToken,
  ): Promise<{ found: number; processed: number }> {
    const stats = { found: 0, processed: 0 };

    try {
      let messageIds: string[] = [];
      let newHistoryId: string | null = null;

      // Try to use History API for incremental processing (if lastHistoryId exists)
      if (token?.lastHistoryId) {
        try {
          this.logger.debug(
            `Using History API for incremental processing (lastHistoryId: ${token.lastHistoryId})`,
          );

          // Get history changes since last check
          const history = await retryWithBackoff(
            () =>
              this.gmailService.listHistory(
                accessToken,
                token.lastHistoryId,
                undefined, // No label filter (check all labels)
                100,
              ),
            {
              maxAttempts: 3,
              onRetry: (attempt, error) => {
                this.logger.debug(
                  `Retrying listHistory for user ${userEmail} (attempt ${attempt}): ${error.message}`,
                );
              },
            },
            this.logger,
          );

          // Extract message IDs from history (only new messages added)
          messageIds = history.history
            .flatMap((h) => h.messagesAdded || [])
            .map((ma) => ma.message.id)
            .filter((id) => id); // Filter out undefined

          newHistoryId = history.historyId;

          this.logger.debug(
            `History API found ${messageIds.length} new messages since last check`,
          );

          // If no new messages, skip processing
          if (messageIds.length === 0) {
            this.logger.debug(`No new messages for user ${userEmail}, skipping`);
            return stats;
          }
        } catch (error) {
          const err = error as Error;
          this.logger.warn(
            `History API failed for user ${userEmail}, falling back to listMessages: ${err.message}`,
          );
          // Fall through to use listMessages as fallback
        }
      }

      // Fallback: Use listMessages if History API not available or failed
      if (messageIds.length === 0) {
      // Search for bounce-related emails in inbox and spam
      // Look for emails with bounce indicators in subject/from
      const bounceQuery = this.buildBounceSearchQuery();

      this.logger.debug(
          `Using listMessages fallback for user ${userEmail} (query: ${bounceQuery})`,
      );

        // Get recent messages (last 100) with retry logic
        const messageList = await retryWithBackoff(
          () =>
            this.gmailService.listMessages(
        accessToken,
        ['INBOX', 'SPAM'],
        100,
        bounceQuery,
            ),
          {
            maxAttempts: 3,
            onRetry: (attempt, error) => {
              this.logger.debug(
                `Retrying listMessages for user ${userEmail} (attempt ${attempt}): ${error.message}`,
              );
            },
          },
          this.logger,
        );

        messageIds = messageList.messages.map((msg) => msg.id);

        // Get current historyId for future incremental processing
        try {
          newHistoryId = await this.gmailService.getCurrentHistoryId(accessToken);
        } catch (error) {
          this.logger.warn(
            `Failed to get current historyId for user ${userEmail}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      this.logger.debug(
        `Found ${messageIds.length} potential bounce emails for user ${userEmail}`,
      );

      // Process messages from search results
      const messagesToProcess = new Set<string>(messageIds);

      this.logger.debug(
        `Processing ${messagesToProcess.size} unique bounce messages for user ${userEmail}`,
      );

      // Update lastHistoryId if we got a new one
      if (newHistoryId && token) {
        try {
          await token.update({ lastHistoryId: newHistoryId });
          this.logger.debug(
            `Updated lastHistoryId to ${newHistoryId} for user ${userEmail}`,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to update lastHistoryId for user ${userEmail}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // Process each unique message
      for (const messageId of messagesToProcess) {
        try {
          // Skip if already processed (check Redis cache)
          if (await this.detectionCacheService.isBounceProcessed(messageId)) {
            continue;
          }

          // Get full message details with retry logic
          const message = await retryWithBackoff(
            () => this.gmailService.getMessage(accessToken, messageId),
            {
              maxAttempts: 3,
              onRetry: (attempt, error) => {
                this.logger.debug(
                  `Retrying getMessage for message ${messageId} (attempt ${attempt}): ${error.message}`,
                );
              },
            },
            this.logger,
          );

          // Double-check it's a bounce (in case it was in a thread but wasn't actually a bounce)
          if (this.isBounceEmail(message)) {
            stats.found++;

            // Process the bounce
            const processed = await this.processBounce(message, userEmail);

            if (processed) {
              stats.processed++;
              // Mark as processed in Redis cache (with automatic TTL)
              await this.detectionCacheService.markBounceProcessed(messageId);
            }
          }
        } catch (error) {
          const err = error as Error;
          this.logger.warn(
            `Error processing message ${messageId}: ${err.message}`,
          );
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
        // Throw error so processor can refresh token and retry
        // This allows immediate token refresh instead of waiting for next scheduler run
        throw error;
      }

      this.logger.error(
        `Error checking inbox for user ${userEmail} (${classified.type}): ${err.message}`,
      );
      throw error;
    }

    return stats;
  }

  /**
   * Build Gmail search query for bounce emails
   */
  private buildBounceSearchQuery(): string {
    // Search for common bounce indicators
    // Use from: prefix for email addresses, and subject: for subject lines
    const queries = [
      'from:mailer-daemon',
      'from:postmaster',
      'from:"Mail Delivery Subsystem"',
      '"mailer-daemon@googlemail.com"',
      'subject:"Delivery Status"',
      'subject:"Failure Notice"',
      'subject:"Undeliverable"',
      'subject:"Returned Mail"',
      'subject:"Delivery failed"',
      'subject:"Mail Delivery"',
      'subject:"Address not found"',
      'subject:"Delivery Failure"',
      'subject:"not found"',
    ];

    // Combine with OR (Gmail API will search in inbox/spam based on labelIds parameter)
    return queries.join(' OR ');
  }

  /**
   * Determine if an email is a bounce notification
   */
  private isBounceEmail(message: {
    headers: Array<{ name: string; value: string }>;
    snippet: string;
  }): boolean {
    const headers = message.headers;
    const snippet = (message.snippet || '').toLowerCase();

    // Check From header
    const from = this.getHeader(headers, 'From')?.toLowerCase() || '';
    const bounceSenders = [
      'mailer-daemon',
      'mail delivery',
      'mail delivery subsystem',
      'postmaster',
      'mailer daemon',
      'delivery status',
      'failure notice',
      'undeliverable',
      'mail system',
      'returned mail',
      'undelivered',
    ];

    const isBounceSender = bounceSenders.some((sender) =>
      from.includes(sender),
    );

    // Check subject
    const subject = this.getHeader(headers, 'Subject')?.toLowerCase() || '';
    const bounceKeywords = [
      'bounce',
      'failure',
      'undeliverable',
      'delivery failed',
      'returned mail',
      'mail delivery',
      'delivery status',
      'failure notice',
    ];

    const hasBounceKeyword =
      bounceKeywords.some((keyword) => subject.includes(keyword)) ||
      bounceKeywords.some((keyword) => snippet.includes(keyword));

    // Check for X-Failed-Recipients header (common in bounces)
    const failedRecipients = this.getHeader(headers, 'X-Failed-Recipients');
    const returnPath = this.getHeader(headers, 'Return-Path');
    const isReturnPath = returnPath?.toLowerCase().includes('<>') || false;

    // Check Content-Type for delivery status notification
    const contentType =
      this.getHeader(headers, 'Content-Type')?.toLowerCase() || '';
    const isDeliveryStatus = contentType.includes('delivery-status');

    return (
      isBounceSender ||
      hasBounceKeyword ||
      !!failedRecipients ||
      isReturnPath ||
      isDeliveryStatus
    );
  }

  /**
   * Process bounce: find original email and update status
   * Public method so ReplyDetectionService can call it when finding bounces in threads
   */
  async processBounce(
    message: {
      id: string;
      payload: any;
      headers: Array<{ name: string; value: string }>;
      snippet: string;
    },
    userEmail: string,
  ): Promise<boolean> {
    try {
      // Parse bounce information
      const bounceInfo = this.parseBounceEmail(message);

      if (!bounceInfo.recipientEmail) {
        this.logger.warn(
          `Could not extract recipient email from bounce message ${message.id}`,
        );
        return false;
      }

      // Check if this Gmail message ID was already processed as a bounce (prevent duplicate processing)
      const existingBounceEvent = await this.emailTrackingEventModel.findOne({
        where: {
          eventType: EmailEventType.BOUNCED,
          gmailMessageId: message.id,
        },
      });

      if (existingBounceEvent) {
        this.logger.debug(
          `Gmail message ${message.id} already processed as bounce for email ${existingBounceEvent.emailMessageId}, skipping duplicate`,
        );
        return false;
      }

      // Find original EmailMessage by recipient email
      const originalEmail = await this.findOriginalEmail(
        bounceInfo.recipientEmail,
        userEmail,
      );

      if (!originalEmail) {
        this.logger.debug(
          `No original email found for bounce recipient: ${bounceInfo.recipientEmail}`,
        );
        return false;
      }

      // Skip if already bounced (double-check after finding email)
      if (
        originalEmail.status === EmailMessageStatus.BOUNCED ||
        originalEmail.bouncedAt
      ) {
        this.logger.debug(
          `Email ${originalEmail.id} already marked as bounced`,
        );
        return false;
      }

      // CRITICAL: If this email was incorrectly marked as replied, clear reply counts
      // Bounces should NEVER be counted as replies
      const updateData: any = {
        status: EmailMessageStatus.BOUNCED,
        bouncedAt: new Date(),
        bounceReason: bounceInfo.reason,
        bounceType: bounceInfo.bounceType,
      };

      // Clear reply counts if this email was incorrectly counted as replied
      const hadReplyCount = originalEmail.replyCount > 0;
      if (hadReplyCount || originalEmail.repliedAt) {
        this.logger.warn(
          `⚠️ Email ${originalEmail.id} has replyCount=${originalEmail.replyCount}, clearing reply data as this is a bounce`,
        );
        updateData.replyCount = 0;
        updateData.repliedAt = null;
        updateData.lastRepliedAt = null;
      }

      // Update EmailMessage
      await originalEmail.update(updateData);

      this.logger.log(
        `✅ Bounce recorded for email ${originalEmail.id} to ${bounceInfo.recipientEmail}: ${bounceInfo.reason}`,
      );

      // Update contact bounce count and status (use atomic increment to prevent race conditions)
      try {
        // Get contact ID from email
        const contactId = originalEmail.contactId;
        if (!contactId) {
          this.logger.warn(`Email ${originalEmail.id} has no contactId, skipping contact update`);
        } else {
          // Use atomic increment to prevent race conditions when multiple bounce events update the same contact
          const sequelize = this.contactModel.sequelize;
          if (!sequelize) {
            throw new Error('Sequelize instance not available');
          }

          const { literal } = sequelize;
          
          // Atomic increment of bounceCount and conditional status update for hard bounces
          const updateData: any = {
            bounceCount: literal('COALESCE(bounce_count, 0) + 1'),
          };

          // Update status to BOUNCED for hard bounces (atomic)
          if (bounceInfo.bounceType === 'HARD' || bounceInfo.bounceType === 'BLOCK') {
            updateData.status = 'BOUNCED';
            this.logger.log(
              `📧 Contact ${contactId} will be marked as BOUNCED due to ${bounceInfo.bounceType} bounce`,
            );
          }

          // Reload contact to get current values for logging
          const contactBefore = await this.contactModel.findByPk(contactId);
          const bounceCountBefore = contactBefore?.bounceCount || 0;

          // Atomic update using literal to prevent race conditions
          const [affectedCount] = await this.contactModel.update(updateData, {
            where: { id: contactId },
          });

          if (affectedCount === 0) {
            this.logger.warn(`Contact ${contactId} not found for bounce update`);
          } else {
            // Reload to get updated bounceCount for logging
            const contactAfter = await this.contactModel.findByPk(contactId);
            const bounceCountAfter = contactAfter?.bounceCount || bounceCountBefore + 1;
            
            this.logger.debug(
              `✅ Updated contact ${contactId} bounceCount: ${bounceCountBefore} → ${bounceCountAfter} (atomic increment)`,
            );
          }
        }
      } catch (error) {
        const err = error as Error;
        this.logger.error(
          `Error updating contact for bounce: ${err.message}`,
          err.stack,
        );
        // Don't throw - bounce event is still recorded even if contact update fails
      }

      // Update step and campaign aggregates (this increments bounce counts)
      await this.updateAggregates(originalEmail);

      // CRITICAL: If this email had reply counts, we need to decrement reply aggregates
      // because it was incorrectly counted as a reply
      if (hadReplyCount && originalEmail.campaignStepId && originalEmail.campaignId) {
        try {
          const replyCountToRemove = originalEmail.replyCount;
          
          // Decrement step reply count
          const step = await CampaignStep.findByPk(originalEmail.campaignStepId);
          if (step && step.emailsReplied > 0) {
            const oldStepReplyCount = step.emailsReplied;
            const newReplyCount = Math.max(0, oldStepReplyCount - replyCountToRemove);
            await step.update({ emailsReplied: newReplyCount });
            this.logger.log(
              `✅ Corrected step ${originalEmail.campaignStepId} emailsReplied: ${oldStepReplyCount} → ${newReplyCount} (removed ${replyCountToRemove})`,
            );
          }

          // Decrement campaign reply count
          const campaign = await Campaign.findByPk(originalEmail.campaignId);
          if (campaign && campaign.emailsReplied > 0) {
            const oldCampaignReplyCount = campaign.emailsReplied;
            const newReplyCount = Math.max(0, oldCampaignReplyCount - replyCountToRemove);
            await campaign.update({ emailsReplied: newReplyCount });
            this.logger.log(
              `✅ Corrected campaign ${originalEmail.campaignId} emailsReplied: ${oldCampaignReplyCount} → ${newReplyCount} (removed ${replyCountToRemove})`,
            );
          }
        } catch (error) {
          const err = error as Error;
          this.logger.error(
            `Error correcting reply aggregates: ${err.message}`,
            err.stack,
          );
        }
      }

      // Record tracking event with Gmail message ID for duplicate detection
      await this.recordTrackingEvent(originalEmail.id, message.id, bounceInfo);

      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error processing bounce for message ${message.id}: ${err.message}`,
        err.stack,
      );
      return false;
    }
  }

  /**
   * Parse bounce email to extract bounce information
   */
  private parseBounceEmail(message: {
    payload: any;
    headers: Array<{ name: string; value: string }>;
    snippet: string;
  }): {
    recipientEmail: string;
    reason: string;
    bounceType: BounceType;
  } {
    const headers = message.headers;

    // Try to extract recipient from headers first
    let recipientEmail =
      this.getHeader(headers, 'X-Failed-Recipients') ||
      this.getHeader(headers, 'X-Original-Recipient') ||
      '';

    // Extract from body if not in headers
    if (!recipientEmail) {
      const body = this.gmailService.extractMessageBody(message.payload);
      const emailPattern =
        /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;

      // Try to find recipient email in body
      // Usually appears after "to:", "recipient:", "for:", etc.
      const recipientMatches = [
        ...body.matchAll(/to:\s*([^\s<]+@[^\s>]+)/gi),
        ...body.matchAll(/recipient:\s*([^\s<]+@[^\s>]+)/gi),
        ...body.matchAll(/for:\s*([^\s<]+@[^\s>]+)/gi),
        ...body.matchAll(/<([^\s<]+@[^\s>]+)>/g),
      ];

      if (recipientMatches.length > 0) {
        // Use first match that looks like an email
        recipientEmail = recipientMatches[0][1] || recipientMatches[0][0];
      } else {
        // Fallback: find any email in body (less reliable)
        const allEmails = [...body.matchAll(emailPattern)];
        if (allEmails.length > 0) {
          recipientEmail = allEmails[0][1];
        }
      }
    }

    // Extract bounce reason
    const body = this.gmailService.extractMessageBody(message.payload);
    const reason = this.extractBounceReason(body, message.snippet);

    // Determine bounce type
    const bounceType = this.determineBounceType(reason, body);

    return {
      recipientEmail: recipientEmail.trim(),
      reason: reason.substring(0, 500), // Limit length
      bounceType,
    };
  }

  /**
   * Extract bounce reason from email body
   */
  private extractBounceReason(body: string, snippet: string): string {
    const text = (body + ' ' + snippet).toLowerCase();

    // Common patterns in bounce messages
    const patterns = [
      /reason:\s*(.+?)(?:\n|$)/i,
      /diagnostic.*?:\s*(.+?)(?:\n|$)/i,
      /remote host said:\s*(.+?)(?:\n|$)/i,
      /error:\s*(.+?)(?:\n|$)/i,
      /failed:\s*(.+?)(?:\n|$)/i,
      /550\s+(.+?)(?:\n|$)/i, // SMTP error code
      /554\s+(.+?)(?:\n|$)/i,
      /553\s+(.+?)(?:\n|$)/i,
    ];

    for (const pattern of patterns) {
      const match = body.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: use snippet or first 200 chars of body
    if (snippet && snippet.length > 10) {
      return snippet.substring(0, 200);
    }

    return body.substring(0, 200);
  }

  /**
   * Determine bounce type (HARD, SOFT, etc.)
   */
  private determineBounceType(reason: string, body: string): BounceType {
    const text = (reason + ' ' + body).toLowerCase();

    // Hard bounces: permanent failures
    // IMPORTANT: "address not found" is always a HARD bounce and will update contact status to BOUNCED
    if (
      text.match(/address.*?not.*?found/i) || // Address not found - always HARD
      text.match(/user.*?not.*?found/i) ||
      text.match(/address.*?not.*?valid/i) ||
      text.match(/no.*?such.*?user/i) ||
      text.match(/invalid.*?recipient/i) ||
      text.match(/550.*?5\.1\.1/i) || // SMTP code for invalid user
      text.match(/550.*?user.*?unknown/i) ||
      text.match(/550.*?mailbox.*?does.*?not.*?exist/i) ||
      text.match(/553.*?user.*?unknown/i)
    ) {
      return BounceType.HARD;
    }

    // Soft bounces: temporary failures
    if (
      text.match(/mailbox.*?full/i) ||
      text.match(/quota.*?exceeded/i) ||
      text.match(/temporary.*?failure/i) ||
      text.match(/retry.*?later/i) ||
      text.match(/451/i) || // SMTP code for temporary failure
      text.match(/452/i) || // SMTP code for insufficient system storage
      text.match(/timeout/i) ||
      text.match(/connection.*?refused/i)
    ) {
      return BounceType.SOFT;
    }

    // Check for spam/block indicators
    if (
      text.match(/spam/i) ||
      text.match(/blocked/i) ||
      text.match(/blacklist/i) ||
      text.match(/rejected.*?by.*?policy/i)
    ) {
      return BounceType.SPAM;
    }

    // Default to SOFT for unknown
    return BounceType.SOFT;
  }

  /**
   * Find original EmailMessage by recipient email
   */
  private async findOriginalEmail(
    recipientEmail: string,
    senderEmail: string,
  ): Promise<EmailMessage | null> {
    // Find contact by email
    const contact = await this.contactModel.findOne({
      where: {
        email: recipientEmail,
      },
    });

    if (!contact) {
      return null;
    }

    // Find EmailMessage for this contact
    // Look for recently sent emails (within last 7 days) that haven't been bounced
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Match by contact and sentFromEmail if available
    const emailMessage = await this.emailMessageModel.findOne({
      where: {
        contactId: contact.id,
        status: {
          [Op.in]: [EmailMessageStatus.SENT, EmailMessageStatus.DELIVERED],
        },
        sentAt: {
          [Op.gte]: sevenDaysAgo,
        },
        bouncedAt: null, // Not already bounced
        // Match by sender email if available
        ...(senderEmail ? { sentFromEmail: senderEmail } : {}),
      },
      include: [
        {
          model: Contact,
          as: 'contact',
        },
      ],
      order: [['sentAt', 'DESC']], // Most recent first
      limit: 1,
    });

    return emailMessage;
  }

  /**
   * Update step and campaign aggregates
   */
  private async updateAggregates(emailMessage: EmailMessage): Promise<void> {
    try {
      // Get step and campaign IDs from emailMessage
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
        await step.increment('emailsBounced');
      }

      // Update campaign aggregates
      const campaign = await Campaign.findByPk(campaignId);
      if (campaign) {
        await campaign.increment('emailsBounced');
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
   * Record bounce tracking event with Gmail message ID for duplicate detection
   */
  private async recordTrackingEvent(
    emailMessageId: string,
    gmailMessageId: string,
    bounceInfo: { reason: string; bounceType: BounceType },
  ): Promise<void> {
    try {
      // Note: EmailTrackingService.recordEvent already handles BOUNCED events
      // and sets bouncedAt timestamp. We've already updated the EmailMessage,
      // but recording the event ensures aggregates are updated properly.
      // Store Gmail message ID in eventData to prevent reply detection from processing it again
      await this.emailTrackingService.recordEvent(
        emailMessageId,
        EmailEventType.BOUNCED,
        {
          gmailMessageId, // Store Gmail message ID to prevent reply detection from processing it again
          bounceReason: bounceInfo.reason,
          bounceType: bounceInfo.bounceType,
        },
      );
    } catch (error) {
      const err = error as Error;
      this.logger.warn(
        `Error recording bounce tracking event: ${err.message}`,
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

