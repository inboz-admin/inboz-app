import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { GmailOAuthToken } from 'src/resources/users/entities/gmail-oauth-token.entity';
import { EmailMessage, EmailMessageStatus } from 'src/resources/campaigns/entities/email-message.entity';
import { Op } from 'sequelize';
import { getMidnightInTimezone, formatDateInTimezone } from '../utils/timezone.util';
import { QuotaManagementService } from './quota-management.service';

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly DEFAULT_DAILY_LIMIT = 25; // Fallback limit (should not be used if QuotaManagementService works correctly)

  constructor(
    @InjectModel(GmailOAuthToken)
    private readonly gmailTokenModel: typeof GmailOAuthToken,
    @InjectModel(EmailMessage)
    private readonly emailMessageModel: typeof EmailMessage,
    private readonly quotaManagementService: QuotaManagementService,
  ) {}

  /**
   * Check if user has quota remaining to send emails
   * @param userId User ID who owns the Gmail account
   * @returns true if user can send, false if quota exceeded
   */
  async checkQuota(userId: string): Promise<boolean> {
    try {
      const token = await this.gmailTokenModel.findOne({
        where: {
          userId,
          status: 'ACTIVE',
        },
      });

      if (!token) {
        this.logger.warn(`No active Gmail token found for user ${userId}`);
        return false;
      }

      // Check if quota needs reset (new day)
      const now = new Date();
      const quotaResetAt = new Date(token.quotaResetAt);

      if (now >= quotaResetAt) {
        // Reset quota for new day
        this.logger.debug(
          `Quota reset needed for user ${userId}: ` +
          `now=${now.toISOString()}, quotaResetAt=${quotaResetAt.toISOString()}`
        );
        await this.resetUserQuota(userId);
        return true;
      }

      // Get dynamic daily limit from subscription plan
      const dailyLimit = await this.quotaManagementService.getDailyEmailLimit(userId);

      // Check if under limit
      const canSend = token.dailyQuotaUsed < dailyLimit;

      if (!canSend) {
        this.logger.warn(
          `Daily quota exceeded for user ${userId}: ${token.dailyQuotaUsed}/${dailyLimit}`,
        );
      }

      return canSend;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error checking quota for user ${userId}: ${err.message}`,
        err.stack,
      );
      return false;
    }
  }

  /**
   * Increment the quota used counter for a user
   * @param userId User ID who owns the Gmail account
   */
  async incrementQuota(userId: string): Promise<void> {
    try {
      const token = await this.gmailTokenModel.findOne({
        where: {
          userId,
          status: 'ACTIVE',
        },
      });

      if (!token) {
        this.logger.warn(`No active Gmail token found for user ${userId}`);
        return;
      }

      // Check if quota needs reset before incrementing
      const now = new Date();
      const quotaResetAt = new Date(token.quotaResetAt);
      if (now >= quotaResetAt) {
        // Reset quota first
        await this.resetUserQuota(userId);
        // Reload token after reset
        await token.reload();
      }

      // Get dynamic daily limit for validation
      const dailyLimit = await this.quotaManagementService.getDailyEmailLimit(userId);
      
      // Validate: prevent quota from exceeding limit
      if (token.dailyQuotaUsed >= dailyLimit) {
        this.logger.warn(
          `⚠️ Quota already at limit for user ${userId}: ${token.dailyQuotaUsed}/${dailyLimit}. Skipping increment.`,
        );
        return;
      }

      await token.increment('dailyQuotaUsed', { by: 1 });
      await token.update({ lastUsedAt: new Date() });

      // Reload to get updated value
      await token.reload();
      
      this.logger.debug(
        `Quota incremented for user ${userId}: ${token.dailyQuotaUsed}/${dailyLimit}`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error incrementing quota for user ${userId}: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Reset quota for a specific user
   * @param userId User ID to reset quota for
   */
  async resetUserQuota(userId: string): Promise<void> {
    try {
      const token = await this.gmailTokenModel.findOne({
        where: {
          userId,
          status: 'ACTIVE',
        },
      });

      if (!token) {
        this.logger.debug(`No active token found for user ${userId}, skipping reset`);
        return;
      }

      // Log before reset for debugging
      const oldQuotaUsed = token.dailyQuotaUsed;
      
      // Reset to UTC midnight (global reset)
      const nextReset = new Date();
      nextReset.setUTCDate(nextReset.getUTCDate() + 1);
      nextReset.setUTCHours(0, 0, 0, 0);

      await token.update({
        dailyQuotaUsed: 0,
        quotaResetAt: nextReset,
      });

      this.logger.log(
        `✅ Quota reset for user ${userId}: ${oldQuotaUsed} → 0. ` +
        `Next reset: ${nextReset.toISOString()} (UTC midnight)`
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error resetting quota for user ${userId}: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Reset all user quotas (called by cron job at midnight IST)
   */
  async resetAllQuotas(): Promise<void> {
    try {
      const now = new Date();
      
      // Find all tokens that need reset (quota_reset_at <= now)
      const tokensToReset = await this.gmailTokenModel.findAll({
        where: {
          quotaResetAt: {
            [Op.lte]: now,
          },
          status: 'ACTIVE',
        },
      });

      if (tokensToReset.length === 0) {
        this.logger.log('No quotas to reset (all quotas are current)');
        return;
      }

      // Log total quota being reset for debugging
      const totalQuotaBeforeReset = tokensToReset.reduce((sum, t) => sum + t.dailyQuotaUsed, 0);
      const usersWithQuota = tokensToReset.filter(t => t.dailyQuotaUsed > 0).length;
      
      // Reset to UTC midnight (global reset)
      const nextReset = new Date();
      nextReset.setUTCDate(nextReset.getUTCDate() + 1);
      nextReset.setUTCHours(0, 0, 0, 0);

      // Bulk update all tokens
      await this.gmailTokenModel.update(
        {
          dailyQuotaUsed: 0,
          quotaResetAt: nextReset,
        },
        {
          where: {
            id: tokensToReset.map(t => t.id),
          },
        },
      );

      this.logger.log(
        `✅ Reset quotas for ${tokensToReset.length} users ` +
        `(${usersWithQuota} had quota > 0, total quota reset: ${totalQuotaBeforeReset}). ` +
        `Next reset: ${nextReset.toISOString()} (UTC midnight)`
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error resetting all quotas: ${err.message}`, err.stack);
    }
  }

  /**
   * Get remaining quota for a user
   * @param userId User ID to check
   * @returns Remaining quota count
   */
  async getRemainingQuota(userId: string): Promise<number> {
    try {
      const token = await this.gmailTokenModel.findOne({
        where: {
          userId,
          status: 'ACTIVE',
        },
      });

      if (!token) {
        return 0;
      }

      // Check if quota needs reset
      const now = new Date();
      const quotaResetAt = new Date(token.quotaResetAt);

      // Get dynamic daily limit from subscription plan
      const dailyLimit = await this.quotaManagementService.getDailyEmailLimit(userId);

      if (now >= quotaResetAt) {
        return dailyLimit;
      }

      return Math.max(0, dailyLimit - token.dailyQuotaUsed);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error getting remaining quota for user ${userId}: ${err.message}`,
        err.stack,
      );
      return 0;
    }
  }

  /**
   * Get quota usage statistics for a user
   * @param userId User ID
   * @param targetDate Optional target date to get quota for a specific day (defaults to today)
   */
  async getQuotaStats(userId: string, targetDate?: Date): Promise<{
    used: number;
    limit: number;
    remaining: number;
    resetAt: Date;
    percentUsed: number;
  }> {
    try {
      const token = await this.gmailTokenModel.findOne({
        where: {
          userId,
          status: 'ACTIVE',
        },
      });

      // Get dynamic daily limit from subscription plan
      const dailyLimit = await this.quotaManagementService.getDailyEmailLimit(userId);

      if (!token) {
        // Calculate next UTC midnight as default
        const nextMidnight = new Date();
        nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
        nextMidnight.setUTCHours(0, 0, 0, 0);
        return {
          used: 0,
          limit: dailyLimit,
          remaining: 0,
          resetAt: nextMidnight,
          percentUsed: 0,
        };
      }

      // Determine which day to check quota for (use UTC for default, or timezone if provided)
      const timezone = 'UTC'; // Default to UTC for getQuotaStats
      const now = new Date();
      const todayStart = getMidnightInTimezone(0, timezone);
      const todayEnd = getMidnightInTimezone(1, timezone);
      
      let dayStart: Date;
      let dayEnd: Date;
      let isToday = false;
      
      if (targetDate) {
        // Extract date components from targetDate (treat as UTC date, not local)
        // Frontend sends date at UTC midnight, so extract year/month/day from UTC
        const targetYear = targetDate.getUTCFullYear();
        const targetMonth = targetDate.getUTCMonth();
        const targetDay = targetDate.getUTCDate();
        
        // Create UTC date for the target day at midnight
        const targetDateUTC = new Date(Date.UTC(targetYear, targetMonth, targetDay, 0, 0, 0, 0));
        
        // Get today's UTC date at midnight
        const todayUTC = new Date(now);
        todayUTC.setUTCHours(0, 0, 0, 0);
        
        // Calculate day offset (0 = today, 1 = tomorrow, etc.)
        const dayOffsetMs = targetDateUTC.getTime() - todayUTC.getTime();
        const dayOffset = Math.round(dayOffsetMs / (24 * 60 * 60 * 1000));
        isToday = dayOffset === 0;
        
        this.logger.debug(
          `📅 Quota check for target date: ` +
          `targetDate=${targetDate.toISOString()}, ` +
          `targetDateUTC=${targetDateUTC.toISOString()}, ` +
          `todayUTC=${todayUTC.toISOString()}, ` +
          `dayOffset=${dayOffset}, ` +
          `isToday=${isToday}`
        );
        
        // Use UTC timezone for day boundaries (consistent with quota reset)
        dayStart = getMidnightInTimezone(dayOffset, 'UTC');
        dayEnd = getMidnightInTimezone(dayOffset + 1, 'UTC');
      } else {
        // Default to today
        dayStart = todayStart;
        dayEnd = todayEnd;
        isToday = true;
      }
      
      let used: number;
      let sentCount = 0;
      
      if (isToday) {
        // For today: Count SENT emails from database (more accurate than dailyQuotaUsed)
        // This avoids double-counting and ensures accuracy
        const sentEmailsCount = await this.emailMessageModel.count({
          where: {
            createdBy: userId,
            scheduledSendAt: {
              [Op.gte]: dayStart,
              [Op.lt]: dayEnd,
            },
            status: {
              [Op.in]: [
                EmailMessageStatus.SENT,
                EmailMessageStatus.DELIVERED,
                // BOUNCED and FAILED are also counted as they consumed quota
                EmailMessageStatus.BOUNCED,
                EmailMessageStatus.FAILED,
              ],
            },
          },
        });
        sentCount = sentEmailsCount;
        
        // Also check if dailyQuotaUsed is out of sync (for logging/debugging)
        if (Math.abs(sentCount - token.dailyQuotaUsed) > 2) {
          this.logger.warn(
            `⚠️ Quota sync issue for user ${userId}: ` +
            `database SENT count=${sentCount}, dailyQuotaUsed=${token.dailyQuotaUsed}. ` +
            `Using database count for accuracy.`
          );
        }
      } else {
        // For future days: only count scheduled emails (no sent emails yet)
        sentCount = 0;
      }
      
      // Count emails already queued for the target day
      // For today: Only count QUEUED and SENDING (SENT/BOUNCED/FAILED already counted above)
      // For future days: Include all scheduled emails that consume quota
      const queuedForDay = await this.emailMessageModel.count({
        where: {
          createdBy: userId,
          scheduledSendAt: {
            [Op.gte]: dayStart,
            [Op.lt]: dayEnd, // Use < to exclude next day's midnight - more reliable
          },
          status: {
            [Op.in]: isToday
              ? [
                  // For today: Only count QUEUED and SENDING (SENT/BOUNCED/FAILED already counted above)
                  EmailMessageStatus.QUEUED,
                  EmailMessageStatus.SENDING,
                ]
              : [
                  // For future days: Include all scheduled emails that consume quota
                  EmailMessageStatus.QUEUED,
                  EmailMessageStatus.SENDING,
                  EmailMessageStatus.BOUNCED,
                  EmailMessageStatus.FAILED,
                ],
          },
        },
      });
      
      // Debug: Log sample emails found for the target day
      const sampleEmails = await this.emailMessageModel.findAll({
        where: {
          createdBy: userId,
          scheduledSendAt: {
            [Op.gte]: dayStart,
            [Op.lt]: dayEnd,
          },
          status: {
            [Op.in]: isToday
              ? [EmailMessageStatus.QUEUED, EmailMessageStatus.SENDING]
              : [
                  EmailMessageStatus.QUEUED,
                  EmailMessageStatus.SENDING,
                  EmailMessageStatus.BOUNCED,
                  EmailMessageStatus.FAILED,
                ],
          },
        },
        attributes: ['scheduledSendAt', 'status'],
        limit: 5,
        order: [['scheduledSendAt', 'ASC']],
      });
      
      this.logger.debug(
        `📊 Quota check for ${targetDate ? 'target day' : 'today'}: ` +
        `dayStart=${dayStart.toISOString()} (${formatDateInTimezone(dayStart, timezone)}), ` +
        `dayEnd=${dayEnd.toISOString()} (${formatDateInTimezone(dayEnd, timezone)}), ` +
        `sentCount=${sentCount}, ` +
        `queuedForDay=${queuedForDay}, ` +
        `sampleEmails=${sampleEmails.length > 0 ? sampleEmails.map(e => formatDateInTimezone(e.scheduledSendAt, timezone)).join(', ') : 'none'}`
      );
      
      // Reuse the daily limit already fetched at the beginning of the function
      
      // Total used = sent + queued (emails scheduled for the target day)
      used = sentCount + queuedForDay;
      const remaining = Math.max(0, dailyLimit - used);
      const percentUsed = (used / dailyLimit) * 100;
      
      // Validation: Ensure used never exceeds limit (shouldn't happen, but log if it does)
      if (used > dailyLimit) {
        this.logger.error(
          `🚨 CRITICAL: Quota calculation error for user ${userId}: ` +
          `used=${used} exceeds limit=${dailyLimit}. ` +
          `sentCount=${sentCount}, queuedForDay=${queuedForDay}. ` +
          `This indicates a serious bug - quota may not be resetting properly or emails are being double-counted.`
        );
        // Cap at limit to prevent negative remaining
        used = dailyLimit;
      }
      
      // Debug: Warn if there's a potential calculation issue
      if (remaining === 0 && used < dailyLimit - 1) {
        this.logger.warn(
          `⚠️ Potential quota calculation issue: used=${used}, limit=${dailyLimit}, remaining=${remaining}. ` +
          `This might indicate a boundary or rounding error.`
        );
      }

      // Calculate reset time (UTC midnight for global reset)
      let resetAt: Date;
      if (isToday) {
        // For today, reset is at next UTC midnight
        const quotaResetAt = new Date(token.quotaResetAt);
        const nextMidnightUTC = new Date();
        nextMidnightUTC.setUTCDate(nextMidnightUTC.getUTCDate() + 1);
        nextMidnightUTC.setUTCHours(0, 0, 0, 0);
        
        // Check if reset time is in the past
        const isPast = quotaResetAt <= now;
        
        if (isPast) {
          resetAt = nextMidnightUTC;
          
          // Update the token if the reset time was incorrect
          await token.update({ quotaResetAt: resetAt }).catch((err) => {
            this.logger.warn(`Failed to update quotaResetAt for user ${userId}: ${err.message}`);
          });
        } else {
          resetAt = quotaResetAt;
        }
      } else {
        // For future days, reset is at UTC midnight
        resetAt = new Date();
        resetAt.setUTCDate(resetAt.getUTCDate() + (dayEnd.getTime() - dayStart.getTime()) / (24 * 60 * 60 * 1000));
        resetAt.setUTCHours(0, 0, 0, 0);
      }

      return {
        used,
        limit: dailyLimit,
        remaining,
        resetAt,
        percentUsed,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error getting quota stats for user ${userId}: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Get remaining quota for multiple days in a single query (OPTIMIZATION: Issue #4)
   * @param userId User ID to check
   * @param startDay Start day offset (0 = today, 1 = tomorrow, etc.)
   * @param endDay End day offset (inclusive)
   * @returns Map of day offset to remaining quota
   */
  async getRemainingQuotaForDays(
    userId: string,
    startDay: number,
    endDay: number,
    timezone: string = 'UTC',
  ): Promise<Map<number, number>> {
    const quotaMap = new Map<number, number>();
    // Get dynamic daily limit from subscription plan
    const dailyLimit = await this.quotaManagementService.getDailyEmailLimit(userId);
    
    // Calculate date range using step timezone
    const rangeStart = getMidnightInTimezone(startDay, timezone);
    const rangeEnd = getMidnightInTimezone(endDay + 1, timezone);
    
    // Check if today (day 0) is in range
    const todayStart = getMidnightInTimezone(0, timezone);
    const todayEnd = getMidnightInTimezone(1, timezone);
    const includesToday = startDay <= 0 && endDay >= 0;
    
    // Get token for today's quota usage
    let todayQuotaUsed = 0;
    if (includesToday) {
      try {
        const token = await this.gmailTokenModel.findOne({
          where: { userId, status: 'ACTIVE' },
        });
        if (token) {
          const now = new Date();
          const quotaResetAt = new Date(token.quotaResetAt);
          if (now < quotaResetAt) {
            todayQuotaUsed = token.dailyQuotaUsed;
          }
        }
      } catch (error) {
        this.logger.warn(`Error getting token for user ${userId}: ${error}`);
      }
    }
    
    // Single query to get all scheduled emails for date range
    const scheduledEmails = await this.emailMessageModel.findAll({
      where: {
        createdBy: userId,
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
      },
      attributes: ['scheduledSendAt', 'status'],
      raw: true,
    });
    
    // Group by day and count (using step timezone)
    for (let day = startDay; day <= endDay; day++) {
      const dayStart = getMidnightInTimezone(day, timezone);
      const dayEnd = getMidnightInTimezone(day + 1, timezone);
      
      // Count scheduled emails for this day
      let scheduledCount = 0;
      let sentCountInScheduled = 0; // Track SENT/DELIVERED emails to avoid double-counting
      
      for (const email of scheduledEmails) {
        const sendAt = new Date(email.scheduledSendAt);
        if (sendAt >= dayStart && sendAt < dayEnd) {
          // For today: Exclude SENT/DELIVERED from scheduledEmails count (they're in todayQuotaUsed)
          // For future days: Include all statuses
          if (day === 0) {
            if (email.status === EmailMessageStatus.SENT || email.status === EmailMessageStatus.DELIVERED) {
              sentCountInScheduled++;
            } else {
              scheduledCount++; // Count QUEUED, SENDING, BOUNCED, FAILED
            }
          } else {
            scheduledCount++; // For future days, count all statuses
          }
        }
      }
      
      // For today: Use todayQuotaUsed (which includes SENT/DELIVERED) + QUEUED/SENDING/BOUNCED/FAILED
      // This avoids double-counting SENT emails that are in both scheduledEmails and todayQuotaUsed
      if (day === 0) {
        // todayQuotaUsed already includes SENT/DELIVERED emails
        // scheduledCount now only includes QUEUED/SENDING/BOUNCED/FAILED
        scheduledCount = todayQuotaUsed + scheduledCount;
      }
      
      const remaining = Math.max(0, dailyLimit - scheduledCount);
      quotaMap.set(day, remaining);
      
      this.logger.debug(
        `📊 Quota for day ${day}: scheduledCount=${scheduledCount}, ` +
        `todayQuotaUsed=${day === 0 ? todayQuotaUsed : 'N/A'}, ` +
        `sentCountInScheduled=${day === 0 ? sentCountInScheduled : 'N/A'}, ` +
        `remaining=${remaining}`
      );
    }
    
    return quotaMap;
  }

  /**
   * Get remaining quota for a specific day, considering already scheduled emails
   * @param userId User ID to check
   * @param dayStart Start of day (midnight in user's timezone)
   * @param dayEnd End of day (midnight in user's timezone of next day)
   * @returns Remaining quota for that day
   */
  async getRemainingQuotaForDay(
    userId: string,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<number> {
    try {
      // Get dynamic daily limit from subscription plan
      const dailyLimit = await this.quotaManagementService.getDailyEmailLimit(userId);
      
      // Check if this is today (day 0) - using UTC for comparison
      const todayStart = getMidnightInTimezone(0, 'UTC');
      const todayEnd = getMidnightInTimezone(1, 'UTC');
      const isToday = dayStart.getTime() === todayStart.getTime() && dayEnd.getTime() === todayEnd.getTime();
      
      let alreadyScheduled = 0;
      
      if (isToday) {
        // For today: count emails already sent + emails already scheduled
        const token = await this.gmailTokenModel.findOne({
          where: {
            userId,
            status: 'ACTIVE',
          },
        });
        
        const sentToday = token ? token.dailyQuotaUsed : 0;
        
        // Count emails already scheduled for today (from database)
        // For today: Exclude BOUNCED/FAILED (already counted in sentToday via dailyQuotaUsed)
        // - QUEUED, SENDING: Currently scheduled
        // - BOUNCED, FAILED: Already counted in sentToday (were sent before bouncing)
        // - SENT, DELIVERED: Already sent (counted in sentToday for today only)
        // Exclude CANCELLED: These don't consume quota
        // Use >= for dayStart and < for dayEnd to include all emails in the day
        // This ensures emails at exactly midnight are counted for the correct day
        const scheduledToday = await this.emailMessageModel.count({
          where: {
            createdBy: userId,
            scheduledSendAt: {
              [Op.gte]: dayStart,      // >= midnight (includes exactly midnight)
              [Op.lt]: dayEnd,         // < next midnight (excludes next day's midnight) - more reliable
            },
            status: {
              [Op.in]: [
                EmailMessageStatus.QUEUED,
                EmailMessageStatus.SENDING,
                // BOUNCED and FAILED are already counted in sentToday (via dailyQuotaUsed)
                // SENT and DELIVERED are already counted in sentToday for today
              ],
            },
          },
        });
        
        this.logger.log(
          `📊 Quota check for today (${dayStart.toISOString()} to ${dayEnd.toISOString()}): ` +
          `Sent: ${sentToday} (includes bounced/failed), Scheduled (queued/sending): ${scheduledToday}, Total used: ${sentToday + scheduledToday}, Daily limit: ${dailyLimit}, Remaining: ${dailyLimit - (sentToday + scheduledToday)}`
        );
        
        alreadyScheduled = sentToday + scheduledToday;
      } else {
        // For future days: count ALL scheduled emails that consume quota
        // Include BOUNCED and FAILED because they were scheduled and consume quota
        // Exclude CANCELLED: These don't consume quota
        // Use >= for dayStart and < for dayEnd to include all emails in the day
        // This ensures emails at exactly midnight (00:00:01) are counted for the correct day
        alreadyScheduled = await this.emailMessageModel.count({
          where: {
            createdBy: userId,
            scheduledSendAt: {
              [Op.gte]: dayStart,      // >= midnight (includes exactly midnight)
              [Op.lt]: dayEnd,         // < next midnight (excludes next day's midnight)
            },
            status: {
              [Op.in]: [
                EmailMessageStatus.QUEUED,
                EmailMessageStatus.SENDING,
                EmailMessageStatus.BOUNCED,
                EmailMessageStatus.FAILED,
                // For future days, SENT/DELIVERED don't exist yet
              ],
            },
          },
        });
        
        // Calculate which IST day this is for logging
        const moment = require('moment-timezone');
        const dayStartUTC = moment.utc(dayStart);
        const dayEndUTC = moment.utc(dayEnd);
        
        // Debug: Also check what emails are actually in the database for this day
        const sampleEmails = await this.emailMessageModel.findAll({
          where: {
            createdBy: userId,
            scheduledSendAt: {
              [Op.gte]: dayStart,
              [Op.lt]: dayEnd,
            },
            status: {
              [Op.in]: [
                EmailMessageStatus.QUEUED,
                EmailMessageStatus.SENDING,
                EmailMessageStatus.BOUNCED,
                EmailMessageStatus.FAILED,
              ],
            },
          },
          attributes: ['id', 'scheduledSendAt', 'status', 'campaignId'],
          limit: 10,
          order: [['scheduledSendAt', 'ASC']],
        });
        
        // Also check ALL emails for this user to see if there's a boundary issue
        const allEmailsNearBoundary = await this.emailMessageModel.findAll({
          where: {
            createdBy: userId,
            scheduledSendAt: {
              [Op.between]: [
                new Date(dayStart.getTime() - 24 * 60 * 60 * 1000), // 1 day before
                new Date(dayEnd.getTime() + 24 * 60 * 60 * 1000),   // 1 day after
              ],
            },
            status: {
              [Op.in]: [
                EmailMessageStatus.QUEUED,
                EmailMessageStatus.SENDING,
                EmailMessageStatus.BOUNCED,
                EmailMessageStatus.FAILED,
              ],
            },
          },
          attributes: ['id', 'scheduledSendAt', 'status', 'campaignId'],
          limit: 20,
          order: [['scheduledSendAt', 'ASC']],
        });
        
        this.logger.log(
          `📊 Quota check for day (boundaries: ${dayStartUTC.format('DD MMM YYYY HH:mm')} to ${dayEndUTC.format('DD MMM YYYY HH:mm')} UTC): ` +
          `Scheduled (including bounced/failed): ${alreadyScheduled}, Daily limit: ${dailyLimit}, Remaining: ${dailyLimit - alreadyScheduled}`
        );
        
        if (sampleEmails.length > 0) {
          this.logger.debug(
            `📧 Emails found in day range (${sampleEmails.length} shown): ` +
            sampleEmails.map(e => {
              const utcTime = e.scheduledSendAt ? moment.utc(e.scheduledSendAt).format('DD MMM YYYY HH:mm:ss [UTC]') : 'null';
              return `${e.scheduledSendAt?.toISOString()} (${utcTime}) [${e.status}]`;
            }).join(', ')
          );
        } else {
          this.logger.debug(`📧 No emails found in database for this day range`);
        }
        
        if (allEmailsNearBoundary.length > 0) {
          this.logger.debug(
            `🔍 All emails near boundary (${allEmailsNearBoundary.length} total): ` +
            allEmailsNearBoundary.map(e => {
              const utcTime = e.scheduledSendAt ? moment.utc(e.scheduledSendAt).format('DD MMM YYYY HH:mm:ss [UTC]') : 'null';
              const inRange = e.scheduledSendAt && e.scheduledSendAt >= dayStart && e.scheduledSendAt < dayEnd ? '✓' : '✗';
              return `${inRange} ${e.scheduledSendAt?.toISOString()} (${utcTime}) [Campaign: ${e.campaignId?.substring(0, 8)}...]`;
            }).join(', ')
          );
        }
      }
      
      return Math.max(0, dailyLimit - alreadyScheduled);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error getting remaining quota for day for user ${userId}: ${err.message}`,
        err.stack,
      );
      // Return 0 on error to be safe
      return 0;
    }
  }
}

