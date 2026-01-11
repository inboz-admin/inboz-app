import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Subscription } from 'src/resources/subscriptions/entities/subscription.entity';
import { SubscriptionPlan } from 'src/resources/subscriptions/entities/subscription-plan.entity';
import { User } from 'src/resources/users/entities/user.entity';
import { Op } from 'sequelize';

@Injectable()
export class QuotaManagementService {
  private readonly logger = new Logger(QuotaManagementService.name);
  private readonly cache = new Map<string, number>(); // Cache for daily limits
  private readonly DEFAULT_DAILY_LIMIT = 30; // Fallback limit

  constructor(
    @InjectModel(Subscription)
    private readonly subscriptionModel: typeof Subscription,
    @InjectModel(SubscriptionPlan)
    private readonly subscriptionPlanModel: typeof SubscriptionPlan,
    @InjectModel(User)
    private readonly userModel: typeof User,
  ) {}

  /**
   * Get daily email limit for a user based on their organization's subscription
   * @param userId User ID
   * @returns Daily email limit
   * 
   * NOTE: Cache temporarily disabled to always fetch fresh limits from database
   */
  async getDailyEmailLimit(userId: string): Promise<number> {
    try {
      // CACHE DISABLED - Always fetch fresh from database
      // const cacheKey = `user:${userId}`;
      // if (this.cache.has(cacheKey)) {
      //   return this.cache.get(cacheKey)!;
      // }

      // Get user's organization
      const user = await this.userModel.findByPk(userId, {
        attributes: ['id', 'organizationId'],
      });

      if (!user || !user.organizationId) {
        this.logger.warn(`User ${userId} not found or has no organization, using default limit`);
        return this.DEFAULT_DAILY_LIMIT;
      }

      // CACHE DISABLED - Always fetch fresh from database
      // const orgCacheKey = `org:${user.organizationId}`;
      // if (this.cache.has(orgCacheKey)) {
      //   const limit = this.cache.get(orgCacheKey)!;
      //   this.cache.set(cacheKey, limit); // Cache for user too
      //   return limit;
      // }

      // Fetch active subscription for organization - ALWAYS FRESH FROM DB
      const subscription = await this.subscriptionModel.findOne({
        where: {
          organizationId: user.organizationId,
          status: {
            [Op.in]: ['ACTIVE', 'TRIAL'],
          },
        },
        include: [
          {
            model: this.subscriptionPlanModel,
            as: 'plan',
            required: true,
          },
        ],
        order: [['createdAt', 'DESC']], // Get most recent subscription
      });

      if (!subscription || !subscription.plan) {
        this.logger.warn(
          `No active subscription found for organization ${user.organizationId}, using default limit`,
        );
        const limit = this.DEFAULT_DAILY_LIMIT;
        // this.cache.set(orgCacheKey, limit);
        // this.cache.set(cacheKey, limit);
        return limit;
      }

      // Get daily email limit from subscription plan
      const dailyLimit = subscription.plan.dailyEmailLimit || this.DEFAULT_DAILY_LIMIT;

      // CACHE DISABLED - Don't cache the result
      // this.cache.set(orgCacheKey, dailyLimit);
      // this.cache.set(cacheKey, dailyLimit);

      this.logger.log(
        `Daily email limit for user ${userId} (org ${user.organizationId}): ${dailyLimit} (fetched fresh from DB)`,
      );

      return dailyLimit;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error getting daily email limit for user ${userId}: ${err.message}`,
        err.stack,
      );
      return this.DEFAULT_DAILY_LIMIT;
    }
  }

  /**
   * Clear cache for a user and/or organization
   * @param userId Optional user ID
   * @param organizationId Optional organization ID
   */
  async clearCache(userId?: string, organizationId?: string): Promise<void> {
    if (userId) {
      this.cache.delete(`user:${userId}`);
      this.logger.debug(`Cleared cache for user ${userId}`);
    }
    if (organizationId) {
      this.cache.delete(`org:${organizationId}`);
      this.logger.debug(`Cleared cache for organization ${organizationId}`);
      // Also clear cache for all users in this organization
      const users = await this.userModel.findAll({
        where: { organizationId },
        attributes: ['id'],
      });
      for (const user of users) {
        this.cache.delete(`user:${user.id}`);
        this.logger.debug(`Cleared cache for user ${user.id} in organization ${organizationId}`);
      }
    }
  }

  /**
   * Clear all cache entries (used during daily quota reset)
   */
  clearAllCache(): void {
    const cacheSize = this.cache.size;
    this.cache.clear();
    this.logger.log(`Cleared all quota management cache (${cacheSize} entries)`);
  }
}
