import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { Campaign } from 'src/resources/campaigns/entities/campaign.entity';
import { CampaignStep } from 'src/resources/campaigns/entities/campaign-step.entity';
import { EmailMessage, EmailMessageStatus } from 'src/resources/campaigns/entities/email-message.entity';
import { GmailOAuthToken } from 'src/resources/users/entities/gmail-oauth-token.entity';
import { RateLimiterService } from './rate-limiter.service';
import { QuotaManagementService } from './quota-management.service';
import { CampaignProcessorQueue } from 'src/configuration/bull/queues/campaign-processor.queue';
import { BounceDetectionQueue } from 'src/configuration/bull/queues/bounce-detection.queue';
import { ReplyDetectionQueue } from 'src/configuration/bull/queues/reply-detection.queue';
import { SchedulerHealthService } from './scheduler-health.service';
import { AccountPriorityService } from './account-priority.service';
import { SubscriptionExpiryService } from 'src/resources/subscriptions/services/subscription-expiry.service';
import { SubscriptionRenewalService } from 'src/resources/subscriptions/services/subscription-renewal.service';
import { AuditLogsService } from 'src/resources/audit-logs/audit-logs.service';
import { AuditAction } from 'src/resources/audit-logs/entities/audit-log.entity';
import { Op } from 'sequelize';
import { NotificationEventService } from 'src/resources/notifications/services/notification-event.service';
import { Inject, forwardRef } from '@nestjs/common';

/**
 * Scheduled Tasks Service
 * Handles cron jobs for:
 * 1. Resetting daily email quotas
 * 2. Checking for completed campaigns
 * 3. Scheduling bounce detection jobs
 * 4. Scheduling reply detection jobs
 * 
 * NOTE: Scheduled step processing is no longer handled here.
 * All steps (IMMEDIATE and SCHEDULE) are processed immediately during campaign activation,
 * with BullMQ handling delays via job delay options.
 */
@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  private bounceDetectionInterval: string;
  private replyDetectionInterval: string;

  constructor(
    @InjectModel(Campaign)
    private readonly campaignModel: typeof Campaign,
    @InjectModel(CampaignStep)
    private readonly campaignStepModel: typeof CampaignStep,
    @InjectModel(EmailMessage)
    private readonly emailMessageModel: typeof EmailMessage,
    @InjectModel(GmailOAuthToken)
    private readonly gmailTokenModel: typeof GmailOAuthToken,
    private readonly rateLimiterService: RateLimiterService,
    private readonly quotaManagementService: QuotaManagementService,
    private readonly campaignProcessorQueue: CampaignProcessorQueue,
    private readonly bounceDetectionQueue: BounceDetectionQueue,
    private readonly replyDetectionQueue: ReplyDetectionQueue,
    private readonly schedulerHealthService: SchedulerHealthService,
    private readonly accountPriorityService: AccountPriorityService,
    private readonly configService: ConfigService,
    private readonly subscriptionExpiryService: SubscriptionExpiryService,
    private readonly subscriptionRenewalService: SubscriptionRenewalService,
    private readonly auditLogsService: AuditLogsService,
    @Inject(forwardRef(() => NotificationEventService))
    private readonly notificationEventService?: NotificationEventService,
  ) {
    // Get intervals from config (default: 2 minutes for dev, 60 minutes for prod)
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    this.bounceDetectionInterval = this.configService.get('BOUNCE_DETECTION_INTERVAL') || 
      (isProduction ? '0 * * * *' : '*/2 * * * *'); // Hourly for prod, every 2 min for dev
    this.replyDetectionInterval = this.configService.get('REPLY_DETECTION_INTERVAL') || 
      (isProduction ? '0 * * * *' : '*/2 * * * *'); // Hourly for prod, every 2 min for dev
  }

  /**
   * Reset daily email quotas for all users
   * Runs daily at UTC midnight (00:00 UTC)
   */
  @Cron('0 0 * * *') // 00:00 UTC (midnight UTC)
  async resetDailyQuotas() {
    const schedulerName = 'DailyQuotaReset';
    this.schedulerHealthService.recordStart(schedulerName);
    const startTime = Date.now();

    try {
      this.logger.log('Running daily quota reset at UTC midnight...');

      await this.rateLimiterService.resetAllQuotas();
      
      // Clear quota management cache to ensure fresh data
      this.quotaManagementService.clearAllCache();

      const duration = Date.now() - startTime;
      this.schedulerHealthService.recordSuccess(schedulerName, duration);
      this.logger.log('Daily quota reset completed');
    } catch (error) {
      const err = error as Error;
      const duration = Date.now() - startTime;
      this.schedulerHealthService.recordFailure(schedulerName, duration, err);
      this.logger.error(
        `Error resetting daily quotas: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Check for campaigns that should be marked as COMPLETED
   * Runs every 5 minutes
   * Uses actual email_messages records for accurate completion check
   * Still needed to mark campaigns as completed when all emails are sent
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkCompletedCampaigns() {
    const schedulerName = 'CheckCompletedCampaigns';
    this.schedulerHealthService.recordStart(schedulerName);
    const startTime = Date.now();

    try {
      this.logger.debug('Checking for completed campaigns...');

      // Find campaigns in ACTIVE status
      const campaigns = await this.campaignModel.findAll({
        where: {
          status: 'ACTIVE',
        },
      });

      for (const campaign of campaigns) {
        try {
          const totalExpectedEmails = campaign.totalRecipients * campaign.totalSteps;
          
          if (totalExpectedEmails === 0) {
            continue; // No emails expected
          }

          // Count actual processed emails from email_messages table
          const processedEmails = await this.emailMessageModel.count({
            where: {
              campaignId: campaign.id,
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
              campaignId: campaign.id,
              status: EmailMessageStatus.QUEUED,
            },
          });

          // Only mark as completed if all emails processed AND none queued
          if (processedEmails >= totalExpectedEmails && queuedEmails === 0) {
            await campaign.update({ 
              status: 'COMPLETED',
              completedAt: new Date(),
            });
            this.logger.log(
              `🎉 Campaign ${campaign.id} marked as COMPLETED ` +
              `(${processedEmails}/${totalExpectedEmails} emails processed, ${queuedEmails} queued)`
            );

            // Log campaign completion in audit log
            try {
              await this.auditLogsService.createAuditLog({
                organizationId: campaign.organizationId,
                performedByUserId: undefined, // System-generated by scheduler
                module: 'CAMPAIGNS',
                action: AuditAction.UPDATE,
                recordId: campaign.id,
                description: `Campaign "${campaign.name}" marked as COMPLETED by scheduled job`,
                details: {
                  campaignId: campaign.id,
                  campaignName: campaign.name,
                  processedEmails,
                  totalExpectedEmails,
                  queuedEmails,
                  triggeredBy: 'scheduled_job',
                  schedulerName: 'CheckCompletedCampaigns',
                },
              });
            } catch (error) {
              this.logger.warn(`Failed to log campaign completion for ${campaign.id}:`, error);
            }

            // Send notification for campaign completion
            try {
              if (this.notificationEventService) {
                await this.notificationEventService.notifyCampaignCompleted(campaign as any);
              }
            } catch (error) {
              this.logger.warn(`Failed to send notification for campaign completion ${campaign.id}:`, error);
            }
          }
        } catch (error) {
          const err = error as Error;
          this.logger.error(
            `Error checking completion for campaign ${campaign.id}: ${err.message}`,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.schedulerHealthService.recordSuccess(schedulerName, duration);
    } catch (error) {
      const err = error as Error;
      const duration = Date.now() - startTime;
      this.schedulerHealthService.recordFailure(schedulerName, duration, err);
      this.logger.error(
        `Error checking completed campaigns: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Check for bounce emails in Gmail inboxes
   * Enqueues jobs for individual accounts instead of processing directly
   * Interval is configurable via BOUNCE_DETECTION_INTERVAL env var
   */
  @Cron('*/2 * * * *') // Default: every 2 minutes (overridden by config)
  async checkForBounces() {
    const schedulerName = 'BounceDetectionScheduler';
    this.schedulerHealthService.recordStart(schedulerName);
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    try {
      this.logger.log(
        `📧 [BOUNCE DETECTION] Starting bounce detection job enqueueing at ${timestamp}...`,
      );

      // Get user IDs who have active campaigns OR sent emails in last 30 days
      const eligibleUserIds = await this.getUsersWithActiveOrRecentCampaigns();

      if (eligibleUserIds.length === 0) {
        this.logger.debug('No users with active campaigns or recent emails found for bounce detection');
        const duration = Date.now() - startTime;
        this.schedulerHealthService.recordSuccess(schedulerName, duration);
        return;
      }

      // Get Gmail tokens only for eligible users (include lastHistoryId for incremental processing)
      const tokens = await this.gmailTokenModel.findAll({
        where: {
          userId: {
            [Op.in]: eligibleUserIds,
          },
          status: 'ACTIVE',
        },
        attributes: ['userId', 'email', 'organizationId', 'lastHistoryId'],
      });

      if (tokens.length === 0) {
        this.logger.debug(`No active Gmail tokens found for ${eligibleUserIds.length} eligible users`);
        const duration = Date.now() - startTime;
        this.schedulerHealthService.recordSuccess(schedulerName, duration);
        return;
      }

      this.logger.log(
        `Found ${tokens.length} active Gmail tokens for ${eligibleUserIds.length} eligible users`,
      );

      // Get priorities for accounts
      const accounts = tokens.map(token => ({
        userId: token.userId,
        userEmail: token.email,
      }));
      const priorities = await this.accountPriorityService.getPriorities(accounts);

      // Enqueue jobs for each account with their priority and lastHistoryId
      const jobs = await Promise.all(
        tokens.map(token =>
          this.bounceDetectionQueue.addBounceDetectionJob(
            token.userId,
            token.email,
            priorities.get(token.userId) || 5,
            token.lastHistoryId, // Pass lastHistoryId for incremental processing
          ),
        ),
      );

      const duration = Date.now() - startTime;
      this.schedulerHealthService.recordSuccess(schedulerName, duration);
      
      this.logger.log(
        `✅ [BOUNCE DETECTION] Enqueued ${jobs.length} bounce detection jobs in ${(duration / 1000).toFixed(2)}s`,
      );
    } catch (error) {
      const err = error as Error;
      const duration = Date.now() - startTime;
      this.schedulerHealthService.recordFailure(schedulerName, duration, err);
      
      this.logger.error(
        `❌ [BOUNCE DETECTION] Failed to enqueue jobs after ${(duration / 1000).toFixed(2)}s: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Check for reply emails in Gmail threads
   * Enqueues jobs for individual accounts instead of processing directly
   * Interval is configurable via REPLY_DETECTION_INTERVAL env var
   */
  @Cron('*/2 * * * *') // Default: every 2 minutes (overridden by config)
  async checkForReplies() {
    const schedulerName = 'ReplyDetectionScheduler';
    this.schedulerHealthService.recordStart(schedulerName);
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    try {
      this.logger.log(
        `📬 [REPLY DETECTION] Starting reply detection job enqueueing at ${timestamp}...`,
      );

      // Get user IDs who have active campaigns OR sent emails in last 30 days
      const eligibleUserIds = await this.getUsersWithActiveOrRecentCampaigns();

      if (eligibleUserIds.length === 0) {
        this.logger.debug('No users with active campaigns or recent emails found for reply detection');
        const duration = Date.now() - startTime;
        this.schedulerHealthService.recordSuccess(schedulerName, duration);
        return;
      }

      // Get Gmail tokens only for eligible users
      const tokens = await this.gmailTokenModel.findAll({
        where: {
          userId: {
            [Op.in]: eligibleUserIds,
          },
          status: 'ACTIVE',
        },
        attributes: ['userId', 'email', 'organizationId'],
      });

      if (tokens.length === 0) {
        this.logger.debug(`No active Gmail tokens found for ${eligibleUserIds.length} eligible users`);
        const duration = Date.now() - startTime;
        this.schedulerHealthService.recordSuccess(schedulerName, duration);
        return;
      }

      this.logger.log(
        `Found ${tokens.length} active Gmail tokens for ${eligibleUserIds.length} eligible users`,
      );

      // Get priorities for accounts
      const accounts = tokens.map(token => ({
        userId: token.userId,
        userEmail: token.email,
      }));
      const priorities = await this.accountPriorityService.getPriorities(accounts);

      // Enqueue jobs for each account with their priority
      const jobs = await Promise.all(
        accounts.map(account =>
          this.replyDetectionQueue.addReplyDetectionJob(
            account.userId,
            account.userEmail,
            priorities.get(account.userId) || 5,
          ),
        ),
      );

      const duration = Date.now() - startTime;
      this.schedulerHealthService.recordSuccess(schedulerName, duration);
      
      this.logger.log(
        `✅ [REPLY DETECTION] Enqueued ${jobs.length} reply detection jobs in ${(duration / 1000).toFixed(2)}s`,
      );
    } catch (error) {
      const err = error as Error;
      const duration = Date.now() - startTime;
      this.schedulerHealthService.recordFailure(schedulerName, duration, err);
      
      this.logger.error(
        `❌ [REPLY DETECTION] Failed to enqueue jobs after ${(duration / 1000).toFixed(2)}s: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Get user IDs who have:
   * 1. Active campaigns, OR
   * 2. Completed campaigns with emails sent in last 30 days
   * 
   * This is the main criteria - we only process bounce/reply detection for these users
   */
  private async getUsersWithActiveOrRecentCampaigns(): Promise<string[]> {
    const eligibleUserIds = new Set<string>();

    // 1. Find users with ACTIVE campaigns
    const activeCampaigns = await this.campaignModel.findAll({
      where: {
        status: 'ACTIVE',
      },
      attributes: ['createdBy'],
      group: ['createdBy'],
    });

    activeCampaigns.forEach(campaign => {
      if (campaign.createdBy) {
        eligibleUserIds.add(campaign.createdBy);
      }
    });

    // 2. Find users with COMPLETED campaigns that have emails sent in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all completed campaigns
    const completedCampaigns = await this.campaignModel.findAll({
      where: {
        status: 'COMPLETED',
      },
      attributes: ['id', 'createdBy'],
    });

    if (completedCampaigns.length > 0) {
      const completedCampaignIds = completedCampaigns.map(c => c.id);

      // Find campaigns that have emails sent in last 30 days
      const recentEmails = await this.emailMessageModel.findAll({
        where: {
          campaignId: {
            [Op.in]: completedCampaignIds,
          },
          sentAt: {
            [Op.gte]: thirtyDaysAgo,
          },
          status: {
            [Op.in]: [EmailMessageStatus.SENT, EmailMessageStatus.DELIVERED],
          },
        },
        attributes: ['campaignId'],
        group: ['campaignId'],
      });

      // Get campaign IDs that have recent emails
      const campaignsWithRecentEmails = new Set(
        recentEmails.map(e => e.campaignId),
      );

      // Add users whose completed campaigns have recent emails
      completedCampaigns.forEach(campaign => {
        if (campaign.createdBy && campaignsWithRecentEmails.has(campaign.id)) {
          eligibleUserIds.add(campaign.createdBy);
        }
      });
    }

    const userIds = Array.from(eligibleUserIds);

    this.logger.debug(
      `Found ${userIds.length} eligible users: ` +
      `${activeCampaigns.length} with active campaigns, ` +
      `${completedCampaigns.length} completed campaigns checked for recent emails`,
    );

    return userIds;
  }

  /**
   * Check and handle expired subscriptions
   * Runs daily at midnight UTC
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkSubscriptionExpiry() {
    const schedulerName = 'SubscriptionExpiry';
    this.schedulerHealthService.recordStart(schedulerName);
    const startTime = Date.now();

    try {
      this.logger.log('Running subscription expiry check...');

      await this.subscriptionExpiryService.checkExpiredSubscriptions();
      await this.subscriptionExpiryService.processScheduledCancellations();
      await this.subscriptionExpiryService.sendExpiryNotifications();

      const duration = Date.now() - startTime;
      this.schedulerHealthService.recordSuccess(schedulerName, duration);
      this.logger.log('Subscription expiry check completed');
    } catch (error) {
      const err = error as Error;
      const duration = Date.now() - startTime;
      this.schedulerHealthService.recordFailure(schedulerName, duration, err);
      this.logger.error(
        `Error checking subscription expiry: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Check subscriptions due for renewal and generate invoices
   * Runs daily at midnight UTC
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkSubscriptionRenewals() {
    const schedulerName = 'SubscriptionRenewals';
    this.schedulerHealthService.recordStart(schedulerName);
    const startTime = Date.now();

    try {
      this.logger.log('Running subscription renewal check...');

      await this.subscriptionRenewalService.checkRenewals();

      const duration = Date.now() - startTime;
      this.schedulerHealthService.recordSuccess(schedulerName, duration);
      this.logger.log('Subscription renewal check completed');
    } catch (error) {
      const err = error as Error;
      const duration = Date.now() - startTime;
      this.schedulerHealthService.recordFailure(schedulerName, duration, err);
      this.logger.error(
        `Error checking subscription renewals: ${err.message}`,
        err.stack,
      );
    }
  }
}

