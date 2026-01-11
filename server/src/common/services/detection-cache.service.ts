import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Detection Cache Service
 * Redis-based persistent cache for bounce and reply detection
 * 
 * Replaces in-memory Sets with Redis for:
 * - Shared state across worker instances
 * - Persistence across restarts
 * - Automatic expiration (TTL)
 * - O(1) lookups using Redis SET operations
 */
@Injectable()
export class DetectionCacheService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis | null = null;
  private readonly logger = new Logger(DetectionCacheService.name);
  private isConnected = false;

  // Redis key prefixes
  private readonly BOUNCE_PREFIX = 'detection:bounce:';
  private readonly REPLY_PREFIX = 'detection:reply:';

  // TTL in seconds
  private readonly BOUNCE_TTL = 7 * 24 * 60 * 60; // 7 days
  private readonly REPLY_TTL = 30 * 24 * 60 * 60; // 30 days

  constructor(private readonly configService: ConfigService) {
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
        this.logger.warn(`⚠️ Redis connection error for DetectionCacheService: ${error.message}`);
        this.isConnected = false;
      });

      this.redis.on('connect', () => {
        this.logger.log('✅ Redis connected for DetectionCacheService');
        this.isConnected = true;
      });

      this.redis.connect().catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`⚠️ Redis connection failed for DetectionCacheService: ${errorMessage}. Falling back to in-memory cache.`);
        this.isConnected = false;
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`⚠️ Failed to initialize Redis for DetectionCacheService: ${errorMessage}. Falling back to in-memory cache.`);
      this.isConnected = false;
    }
  }

  async onModuleInit() {
    if (this.isConnected) {
      this.logger.log('✅ DetectionCacheService initialized and connected to Redis');
    } else {
      this.logger.warn('⚠️ DetectionCacheService initialized but Redis is not available. Using in-memory fallback.');
    }
  }

  async onModuleDestroy() {
    try {
      if (this.redis) {
        await this.redis.quit().catch(() => {
          // Ignore errors during shutdown
        });
      }
    } catch (error) {
      // Ignore errors during shutdown
    }
  }

  /**
   * Check if a bounce message ID has been processed
   */
  async isBounceProcessed(messageId: string): Promise<boolean> {
    if (!this.isConnected || !this.redis) {
      return false; // If Redis unavailable, allow processing (fallback behavior)
    }

    try {
      const key = `${this.BOUNCE_PREFIX}${messageId}`;
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.warn(`Error checking bounce cache for ${messageId}: ${error instanceof Error ? error.message : String(error)}`);
      return false; // On error, allow processing
    }
  }

  /**
   * Mark a bounce message ID as processed
   */
  async markBounceProcessed(messageId: string): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return; // Silently fail if Redis unavailable
    }

    try {
      const key = `${this.BOUNCE_PREFIX}${messageId}`;
      await this.redis.setex(key, this.BOUNCE_TTL, '1');
    } catch (error) {
      this.logger.warn(`Error marking bounce as processed for ${messageId}: ${error instanceof Error ? error.message : String(error)}`);
      // Don't throw - cache failures shouldn't block processing
    }
  }

  /**
   * Check if a reply thread ID has been processed
   */
  async isReplyProcessed(threadId: string): Promise<boolean> {
    if (!this.isConnected || !this.redis) {
      return false; // If Redis unavailable, allow processing (fallback behavior)
    }

    try {
      const key = `${this.REPLY_PREFIX}${threadId}`;
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.warn(`Error checking reply cache for ${threadId}: ${error instanceof Error ? error.message : String(error)}`);
      return false; // On error, allow processing
    }
  }

  /**
   * Mark a reply thread ID as processed
   */
  async markReplyProcessed(threadId: string): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return; // Silently fail if Redis unavailable
    }

    try {
      const key = `${this.REPLY_PREFIX}${threadId}`;
      await this.redis.setex(key, this.REPLY_TTL, '1');
    } catch (error) {
      this.logger.warn(`Error marking reply as processed for ${threadId}: ${error instanceof Error ? error.message : String(error)}`);
      // Don't throw - cache failures shouldn't block processing
    }
  }

  /**
   * Batch mark multiple bounce message IDs as processed
   */
  async markBouncesProcessed(messageIds: string[]): Promise<void> {
    if (!this.isConnected || !this.redis || messageIds.length === 0) {
      return;
    }

    try {
      const pipeline = this.redis.pipeline();
      for (const messageId of messageIds) {
        const key = `${this.BOUNCE_PREFIX}${messageId}`;
        pipeline.setex(key, this.BOUNCE_TTL, '1');
      }
      await pipeline.exec();
    } catch (error) {
      this.logger.warn(`Error batch marking bounces as processed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Batch mark multiple reply thread IDs as processed
   */
  async markRepliesProcessed(threadIds: string[]): Promise<void> {
    if (!this.isConnected || !this.redis || threadIds.length === 0) {
      return;
    }

    try {
      const pipeline = this.redis.pipeline();
      for (const threadId of threadIds) {
        const key = `${this.REPLY_PREFIX}${threadId}`;
        pipeline.setex(key, this.REPLY_TTL, '1');
      }
      await pipeline.exec();
    } catch (error) {
      this.logger.warn(`Error batch marking replies as processed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clear all bounce cache entries (for testing/debugging)
   */
  async clearBounceCache(): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return;
    }

    try {
      const keys = await this.redis.keys(`${this.BOUNCE_PREFIX}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.warn(`Error clearing bounce cache: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clear all reply cache entries (for testing/debugging)
   */
  async clearReplyCache(): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return;
    }

    try {
      const keys = await this.redis.keys(`${this.REPLY_PREFIX}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.warn(`Error clearing reply cache: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

