import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import Redis from 'ioredis';

/**
 * OAuth State Service
 * Manages OAuth state parameters for CSRF protection
 * Stores state tokens in Redis with expiration
 */
@Injectable()
export class OAuthStateService {
  private readonly logger = new Logger(OAuthStateService.name);
  private redis: Redis | null = null;
  private readonly STATE_PREFIX = 'oauth:state:';
  private readonly STATE_TTL = 10 * 60; // 10 minutes in seconds

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
        this.logger.warn(`Redis connection error for OAuthStateService: ${error.message}`);
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis connected for OAuthStateService');
      });

      this.redis.connect().catch((error) => {
        this.logger.warn(
          `Redis connection failed for OAuthStateService: ${error instanceof Error ? error.message : 'Unknown error'}. State validation may not work properly.`,
        );
      });
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Redis for OAuthStateService: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate a cryptographically secure random state token
   */
  generateStateToken(): string {
    // Generate 32 random bytes and convert to base64url
    const random = randomBytes(32);
    return random.toString('base64url');
  }

  /**
   * Store state token in Redis with expiration
   * @param state The state token to store
   * @param metadata Optional metadata to store with the state (e.g., redirect URL)
   */
  async storeState(state: string, metadata?: Record<string, any>): Promise<void> {
    if (!this.redis) {
      this.logger.warn('Redis not available, state validation will be skipped');
      return;
    }

    try {
      const key = `${this.STATE_PREFIX}${state}`;
      const value = metadata ? JSON.stringify(metadata) : '1';
      await this.redis.setex(key, this.STATE_TTL, value);
    } catch (error) {
      this.logger.error(
        `Failed to store OAuth state: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Validate and consume state token
   * @param state The state token to validate
   * @returns The stored metadata if state is valid, null otherwise
   */
  async validateAndConsumeState(state: string): Promise<Record<string, any> | null> {
    if (!this.redis) {
      this.logger.warn('Redis not available, state validation skipped');
      return null; // Allow request to proceed if Redis is unavailable (graceful degradation)
    }

    if (!state || typeof state !== 'string') {
      return null;
    }

    try {
      const key = `${this.STATE_PREFIX}${state}`;
      const value = await this.redis.get(key);

      if (!value) {
        this.logger.warn(`Invalid or expired OAuth state token: ${state}`);
        return null;
      }

      // Delete the state token after validation (one-time use)
      await this.redis.del(key);

      // Parse metadata if present
      try {
        return value === '1' ? {} : JSON.parse(value);
      } catch {
        return {};
      }
    } catch (error) {
      this.logger.error(
        `Failed to validate OAuth state: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Clean up expired state tokens (optional maintenance method)
   */
  async cleanupExpiredStates(): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      // Redis TTL handles expiration automatically, but we can scan for any orphaned keys
      const keys = await this.redis.keys(`${this.STATE_PREFIX}*`);
      if (keys.length > 0) {
        // Check TTL for each key and delete if expired
        for (const key of keys) {
          const ttl = await this.redis.ttl(key);
          if (ttl === -2) {
            // Key doesn't exist (already expired)
            await this.redis.del(key);
          }
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to cleanup expired states: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
