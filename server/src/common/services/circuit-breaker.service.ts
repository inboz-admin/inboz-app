import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Circuit is open, failing fast
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Open circuit after N failures
  successThreshold: number; // Close circuit after N successes (in half-open state)
  timeout: number; // Time in ms before attempting half-open
  resetTimeout: number; // Time in ms before resetting failure count
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5, // Open after 5 consecutive failures
  successThreshold: 2, // Close after 2 successes in half-open
  timeout: 5 * 60 * 1000, // 5 minutes before half-open
  resetTimeout: 10 * 60 * 1000, // 10 minutes before resetting failure count
};

/**
 * Circuit Breaker Service
 * 
 * Prevents hammering failing accounts by tracking failures and temporarily
 * skipping accounts that are repeatedly failing.
 * 
 * Uses Redis for shared state across multiple scheduler instances.
 */
@Injectable()
export class CircuitBreakerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private redis: Redis | null = null;
  private readonly config: CircuitBreakerConfig;
  private readonly keyPrefix = 'circuit-breaker:';
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    this.config = DEFAULT_CONFIG;
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
        this.logger.warn(`⚠️ Redis connection error: ${error.message}`);
        this.isConnected = false;
      });

      this.redis.on('connect', () => {
        this.logger.log('✅ Redis connected for circuit breaker');
        this.isConnected = true;
      });

      this.redis.connect().catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `⚠️ Redis connection failed: ${errorMessage}. Circuit breaker will use in-memory fallback.`,
        );
        this.isConnected = false;
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `⚠️ Failed to initialize Redis: ${errorMessage}. Circuit breaker will use in-memory fallback.`,
      );
      this.isConnected = false;
    }
  }

  async onModuleInit() {
    // Connection is established lazily
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  /**
   * Get circuit state for an account
   */
  async getState(accountId: string): Promise<CircuitState> {
    if (!this.isConnected || !this.redis) {
      // Fallback: assume closed if Redis unavailable
      return CircuitState.CLOSED;
    }

    try {
      const stateKey = `${this.keyPrefix}state:${accountId}`;
      const state = await this.redis.get(stateKey);
      
      if (!state) {
        return CircuitState.CLOSED;
      }

      return state as CircuitState;
    } catch (error) {
      this.logger.warn(
        `Failed to get circuit state for account ${accountId}: ${(error as Error).message}`,
      );
      return CircuitState.CLOSED; // Fail open (allow operation)
    }
  }

  /**
   * Check if circuit is open (should skip this account)
   */
  async isOpen(accountId: string): Promise<boolean> {
    const state = await this.getState(accountId);
    return state === CircuitState.OPEN;
  }

  /**
   * Record a failure for an account
   */
  async recordFailure(accountId: string): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return; // Skip if Redis unavailable
    }

    try {
      const failureKey = `${this.keyPrefix}failures:${accountId}`;
      const stateKey = `${this.keyPrefix}state:${accountId}`;
      const openedAtKey = `${this.keyPrefix}opened-at:${accountId}`;

      // Increment failure count
      const failures = await this.redis.incr(failureKey);
      
      // Set expiration on failure count
      await this.redis.expire(failureKey, this.config.resetTimeout / 1000);

      // Check if we should open the circuit
      if (failures >= this.config.failureThreshold) {
        const currentState = await this.getState(accountId);
        
        if (currentState !== CircuitState.OPEN) {
          await this.redis.set(stateKey, CircuitState.OPEN);
          await this.redis.set(openedAtKey, Date.now().toString());
          await this.redis.expire(openedAtKey, this.config.timeout / 1000);
          
          this.logger.warn(
            `🔴 Circuit breaker OPENED for account ${accountId} after ${failures} failures`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to record failure for account ${accountId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Record a success for an account
   */
  async recordSuccess(accountId: string): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return; // Skip if Redis unavailable
    }

    try {
      const failureKey = `${this.keyPrefix}failures:${accountId}`;
      const stateKey = `${this.keyPrefix}state:${accountId}`;
      const successKey = `${this.keyPrefix}successes:${accountId}`;
      const openedAtKey = `${this.keyPrefix}opened-at:${accountId}`;

      const currentState = await this.getState(accountId);

      if (currentState === CircuitState.HALF_OPEN) {
        // Increment success count in half-open state
        const successes = await this.redis.incr(successKey);
        await this.redis.expire(successKey, this.config.timeout / 1000);

        // Close circuit if we have enough successes
        if (successes >= this.config.successThreshold) {
          await this.redis.del(stateKey);
          await this.redis.del(successKey);
          await this.redis.del(failureKey);
          await this.redis.del(openedAtKey);
          
          this.logger.log(
            `🟢 Circuit breaker CLOSED for account ${accountId} after ${successes} successes`,
          );
        }
      } else if (currentState === CircuitState.OPEN) {
        // Check if timeout has passed, move to half-open
        const openedAt = await this.redis.get(openedAtKey);
        if (openedAt) {
          const openedAtTime = parseInt(openedAt, 10);
          const elapsed = Date.now() - openedAtTime;

          if (elapsed >= this.config.timeout) {
            await this.redis.set(stateKey, CircuitState.HALF_OPEN);
            await this.redis.set(successKey, '1');
            await this.redis.expire(successKey, this.config.timeout / 1000);
            
            this.logger.log(
              `🟡 Circuit breaker HALF-OPEN for account ${accountId} (testing recovery)`,
            );
          }
        }
      } else {
        // Reset failure count on success in closed state
        await this.redis.del(failureKey);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to record success for account ${accountId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Reset circuit breaker for an account (manual reset)
   */
  async reset(accountId: string): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return;
    }

    try {
      const keys = [
        `${this.keyPrefix}state:${accountId}`,
        `${this.keyPrefix}failures:${accountId}`,
        `${this.keyPrefix}successes:${accountId}`,
        `${this.keyPrefix}opened-at:${accountId}`,
      ];

      await this.redis.del(...keys);
      
      this.logger.log(`🔄 Circuit breaker RESET for account ${accountId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to reset circuit breaker for account ${accountId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get failure count for an account
   */
  async getFailureCount(accountId: string): Promise<number> {
    if (!this.isConnected || !this.redis) {
      return 0;
    }

    try {
      const failureKey = `${this.keyPrefix}failures:${accountId}`;
      const count = await this.redis.get(failureKey);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      return 0;
    }
  }
}

