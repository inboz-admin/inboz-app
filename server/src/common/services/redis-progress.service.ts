import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis Pub/Sub Service for Real-time Progress Updates
 *
 * Worker Process: Publishes progress events
 * API Server: Subscribes and forwards to WebSocket clients
 * 
 * Gracefully handles Redis connection failures - app continues to work without Redis
 */
@Injectable()
export class RedisProgressService implements OnModuleInit, OnModuleDestroy {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private readonly PROGRESS_CHANNEL = 'upload-progress';
  private readonly logger = new Logger(RedisProgressService.name);
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    // Try to create Redis connections with error handling
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
        lazyConnect: true, // Don't connect immediately
      };

      this.publisher = new Redis(redisConfig);
      this.subscriber = new Redis(redisConfig);

      // Handle connection errors gracefully
      this.publisher.on('error', (error) => {
        this.logger.warn(`⚠️ Redis publisher connection error: ${error.message}`);
        this.isConnected = false;
      });

      this.subscriber.on('error', (error) => {
        this.logger.warn(`⚠️ Redis subscriber connection error: ${error.message}`);
        this.isConnected = false;
      });

      this.publisher.on('connect', () => {
        this.logger.log('✅ Redis publisher connected');
        this.isConnected = true;
      });

      this.subscriber.on('connect', () => {
        this.logger.log('✅ Redis subscriber connected');
        this.isConnected = true;
      });

      // Attempt to connect
      this.publisher.connect().catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`⚠️ Redis publisher connection failed: ${errorMessage}. App will continue without Redis pub/sub.`);
        this.isConnected = false;
      });

      this.subscriber.connect().catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`⚠️ Redis subscriber connection failed: ${errorMessage}. App will continue without Redis pub/sub.`);
        this.isConnected = false;
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`⚠️ Failed to initialize Redis: ${errorMessage}. App will continue without Redis pub/sub.`);
      this.isConnected = false;
    }
  }

  async onModuleInit() {
    if (this.isConnected) {
      this.logger.log('✅ RedisProgressService initialized and connected');
    } else {
      this.logger.warn('⚠️ RedisProgressService initialized but Redis is not available. Progress updates will be limited.');
    }
  }

  async onModuleDestroy() {
    try {
      if (this.publisher) {
        await this.publisher.quit().catch(() => {
          // Ignore errors during shutdown
        });
      }
      if (this.subscriber) {
        await this.subscriber.quit().catch(() => {
          // Ignore errors during shutdown
        });
      }
    } catch (error) {
      // Ignore errors during shutdown
    }
  }

  /**
   * Publish progress update (called from Worker)
   */
  async publishProgress(fileId: string, progress: any): Promise<void> {
    if (!this.publisher || !this.isConnected) {
      // Silently fail - app continues without Redis
      return;
    }

    try {
      const message = JSON.stringify({ fileId, progress });
      await this.publisher.publish(this.PROGRESS_CHANNEL, message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Failed to publish progress to Redis: ${errorMessage}`);
      // Don't throw - allow app to continue
    }
  }

  /**
   * Subscribe to progress updates (called from API Server)
   */
  subscribeToProgress(callback: (fileId: string, progress: any) => void): void {
    if (!this.subscriber || !this.isConnected) {
      this.logger.warn('⚠️ Cannot subscribe to Redis progress - Redis not available');
      return;
    }

    try {
      this.subscriber.subscribe(this.PROGRESS_CHANNEL);

      this.subscriber.on('message', (channel, message) => {
        if (channel === this.PROGRESS_CHANNEL) {
          try {
            const { fileId, progress } = JSON.parse(message);
            callback(fileId, progress);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.debug(`Failed to parse progress message: ${errorMessage}`);
          }
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to subscribe to Redis progress: ${errorMessage}`);
      // Don't throw - allow app to continue
    }
  }
}
