import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import Redis from 'ioredis';
import { Op } from 'sequelize';
import { GmailOAuthToken } from 'src/resources/users/entities/gmail-oauth-token.entity';
import { EmailMessage, EmailMessageStatus } from 'src/resources/campaigns/entities/email-message.entity';

/**
 * Account Priority Service
 * Tracks account activity and assigns priority for detection jobs
 * 
 * High-activity accounts (recent sends/replies) get higher priority
 * Low-activity accounts get lower priority (checked less frequently)
 */
@Injectable()
export class AccountPriorityService implements OnModuleInit {
  private readonly logger = new Logger(AccountPriorityService.name);
  private redis: Redis | null = null;
  private isConnected = false;

  private readonly PRIORITY_PREFIX = 'account:priority:';
  private readonly ACTIVITY_PREFIX = 'account:activity:';
  private readonly PRIORITY_TTL = 24 * 60 * 60; // 24 hours

  // Priority levels (1-10, higher = more priority)
  private readonly HIGH_PRIORITY = 8; // Active accounts (sent emails in last 24 hours)
  private readonly MEDIUM_PRIORITY = 5; // Moderate activity (sent emails in last 7 days)
  private readonly LOW_PRIORITY = 2; // Low activity (no recent sends)

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(GmailOAuthToken)
    private readonly gmailTokenModel: typeof GmailOAuthToken,
    @InjectModel(EmailMessage)
    private readonly emailMessageModel: typeof EmailMessage,
  ) {
    this.initializeRedis();
  }

  private initializeRedis() {
    try {
      const redisConfig = {
        host: this.configService.get('REDIS_HOST') || 'localhost',
        port: this.configService.get('REDIS_PORT') || 6379,
        password: this.configService.get('REDIS_PASSWORD'),
        db: this.configService.get('REDIS_DB') || 0,
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        enableReadyCheck: true,
        lazyConnect: true,
      };

      this.redis = new Redis(redisConfig);

      this.redis.on('error', (error) => {
        this.logger.warn(`⚠️ Redis connection error for AccountPriorityService: ${error.message}`);
        this.isConnected = false;
      });

      this.redis.on('connect', () => {
        this.logger.log('✅ Redis connected for AccountPriorityService');
        this.isConnected = true;
      });

      this.redis.connect().catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`⚠️ Redis connection failed for AccountPriorityService: ${errorMessage}. Using default priorities.`);
        this.isConnected = false;
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`⚠️ Failed to initialize Redis for AccountPriorityService: ${errorMessage}. Using default priorities.`);
      this.isConnected = false;
    }
  }

  async onModuleInit() {
    if (this.isConnected) {
      this.logger.log('✅ AccountPriorityService initialized and connected to Redis');
    } else {
      this.logger.warn('⚠️ AccountPriorityService initialized but Redis is not available. Using default priorities.');
    }
  }

  /**
   * Get priority for an account based on recent activity
   */
  async getPriority(userId: string, userEmail: string): Promise<number> {
    // Check Redis cache first
    if (this.isConnected && this.redis) {
      try {
        const cachedPriority = await this.redis.get(`${this.PRIORITY_PREFIX}${userId}`);
        if (cachedPriority) {
          return parseInt(cachedPriority, 10);
        }
      } catch (error) {
        this.logger.warn(`Error getting cached priority for user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Calculate priority based on recent email activity
    const priority = await this.calculatePriority(userId, userEmail);

    // Cache the priority
    if (this.isConnected && this.redis) {
      try {
        await this.redis.setex(`${this.PRIORITY_PREFIX}${userId}`, this.PRIORITY_TTL, priority.toString());
      } catch (error) {
        // Ignore cache errors
      }
    }

    return priority;
  }

  /**
   * Calculate priority based on recent email activity
   */
  private async calculatePriority(userId: string, userEmail: string): Promise<number> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Check for emails sent in last 24 hours
      const recentEmails = await this.emailMessageModel.count({
        where: {
          sentFromEmail: userEmail,
          status: {
            [Op.in]: [EmailMessageStatus.SENT, EmailMessageStatus.DELIVERED],
          },
          sentAt: {
            [Op.gte]: oneDayAgo,
          },
        },
      });

      if (recentEmails > 0) {
        return this.HIGH_PRIORITY;
      }

      // Check for emails sent in last 7 days
      const weekEmails = await this.emailMessageModel.count({
        where: {
          sentFromEmail: userEmail,
          status: {
            [Op.in]: [EmailMessageStatus.SENT, EmailMessageStatus.DELIVERED],
          },
          sentAt: {
            [Op.gte]: sevenDaysAgo,
          },
        },
      });

      if (weekEmails > 0) {
        return this.MEDIUM_PRIORITY;
      }

      return this.LOW_PRIORITY;
    } catch (error) {
      this.logger.warn(`Error calculating priority for user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
      return this.MEDIUM_PRIORITY; // Default to medium priority on error
    }
  }

  /**
   * Update account activity (called when emails are sent)
   */
  async recordActivity(userId: string): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return;
    }

    try {
      const key = `${this.ACTIVITY_PREFIX}${userId}`;
      await this.redis.setex(key, this.PRIORITY_TTL, Date.now().toString());
      
      // Invalidate priority cache to force recalculation
      await this.redis.del(`${this.PRIORITY_PREFIX}${userId}`);
    } catch (error) {
      // Ignore cache errors
    }
  }

  /**
   * Get priorities for multiple accounts in batch
   */
  async getPriorities(
    accounts: Array<{ userId: string; userEmail: string }>,
  ): Promise<Map<string, number>> {
    const priorities = new Map<string, number>();

    // Process in parallel
    const priorityPromises = accounts.map(async (account) => {
      const priority = await this.getPriority(account.userId, account.userEmail);
      return { userId: account.userId, priority };
    });

    const results = await Promise.all(priorityPromises);
    results.forEach(({ userId, priority }) => {
      priorities.set(userId, priority);
    });

    return priorities;
  }

  /**
   * Clear priority cache for an account (force recalculation)
   */
  async clearPriorityCache(userId: string): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return;
    }

    try {
      await this.redis.del(`${this.PRIORITY_PREFIX}${userId}`);
    } catch (error) {
      // Ignore cache errors
    }
  }
}

