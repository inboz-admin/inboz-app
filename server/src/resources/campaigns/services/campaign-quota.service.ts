import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RateLimiterService } from 'src/common/services/rate-limiter.service';
import { QuotaManagementService } from 'src/common/services/quota-management.service';
import { CampaignSchedulingService } from './campaign-scheduling.service';
import { QUOTA_CHECK_WINDOW_DAYS } from '../constants/campaign.constants';

/**
 * Service for campaign quota operations
 * Centralizes quota retrieval, validation, and distribution logic (DRY principle)
 */
export interface QuotaInfo {
  remaining: number;
  dailyLimit: number;
  used: number;
  limit: number;
  resetAt: Date;
  percentUsed: number;
}

export interface QuotaDistributionResult {
  distribution: Array<{
    day: number;
    startIndex: number;
    endIndex: number;
    quotaUsed: number;
  }>;
  daysNeeded: number;
  willSpread: boolean;
}

export type QuotaMode = 'auto-spread' | 'restrict';

@Injectable()
export class CampaignQuotaService {
  private readonly logger = new Logger(CampaignQuotaService.name);

  constructor(
    private readonly rateLimiterService: RateLimiterService,
    private readonly quotaManagementService: QuotaManagementService,
    private readonly campaignSchedulingService: CampaignSchedulingService,
  ) {}

  /**
   * Get quota information for a user
   * Combines quota stats and daily limit in a single call
   * 
   * Time Complexity: O(1) - Two parallel API calls
   * Space Complexity: O(1)
   * 
   * @param userId - User ID to get quota for
   * @returns Quota information including remaining, daily limit, etc.
   */
  async getQuotaInfo(userId: string): Promise<QuotaInfo> {
    const [quotaStats, dailyLimit] = await Promise.all([
      this.rateLimiterService.getQuotaStats(userId),
      this.quotaManagementService.getDailyEmailLimit(userId),
    ]);

    return {
      remaining: quotaStats.remaining,
      dailyLimit,
      used: quotaStats.used,
      limit: quotaStats.limit,
      resetAt: quotaStats.resetAt,
      percentUsed: quotaStats.percentUsed,
    };
  }

  /**
   * Validate quota and calculate distribution based on mode
   * Unified logic for both auto-spread and restrict modes
   * 
   * Time Complexity: O(D) where D = number of days needed
   * Space Complexity: O(D) for distribution array
   * 
   * @param userId - User ID
   * @param totalEmails - Total emails needed
   * @param mode - Quota mode: 'auto-spread' or 'restrict'
   * @returns Quota distribution result
   */
  async validateAndCalculateDistribution(
    userId: string,
    totalEmails: number,
    mode: QuotaMode,
    timezone: string = 'UTC',
  ): Promise<QuotaDistributionResult> {
    const quotaInfo = await this.getQuotaInfo(userId);
    const { remaining, dailyLimit } = quotaInfo;

    // If quota is sufficient, no distribution needed
    if (totalEmails <= remaining) {
      return {
        distribution: [],
        daysNeeded: 0,
        willSpread: false,
      };
    }

    // Restrict mode: Check if quota available in next N days
    if (mode === 'restrict') {
      const daysAhead = QUOTA_CHECK_WINDOW_DAYS; // 30 days
      const availableQuota = remaining + daysAhead * dailyLimit;

      if (totalEmails > availableQuota) {
        throw new BadRequestException(
          `Cannot proceed. Needs ${totalEmails} emails but only ${availableQuota} available in next ${daysAhead} days. ` +
            `Please reduce campaign size or wait for quota to replenish.`,
        );
      }
    }

    // Calculate distribution using unified scheduling service
    const distribution =
      await this.campaignSchedulingService.calculateQuotaDistribution(
        userId,
        totalEmails,
        remaining,
        dailyLimit,
        timezone,
      );

    const daysNeeded = distribution.length;

    this.logger.log(
      `Quota distribution calculated: ${totalEmails} emails across ${daysNeeded} day(s). ` +
        `Remaining quota: ${remaining}, Daily limit: ${dailyLimit}, Mode: ${mode}`,
    );

    return {
      distribution,
      daysNeeded,
      willSpread: daysNeeded > 1,
    };
  }

  /**
   * Validate quota for campaign activation/resume
   * Throws exception if quota insufficient in restrict mode
   * 
   * @param userId - User ID
   * @param totalEmails - Total emails needed
   * @param mode - Quota mode
   */
  async validateQuotaForOperation(
    userId: string,
    totalEmails: number,
    mode: QuotaMode,
  ): Promise<void> {
    await this.validateAndCalculateDistribution(userId, totalEmails, mode);
    // If no exception thrown, quota is valid
  }
}

