/**
 * Dedicated Worker Process for BullMQ Jobs
 *
 * This runs separately from the main API server to:
 * - Prevent blocking API requests during heavy processing
 * - Enable horizontal scaling (run multiple worker instances)
 * - Isolate worker crashes from API server
 * - Better resource utilization
 *
 * Usage:
 *   npm run start:worker        # Development
 *   npm run start:worker:prod   # Production
 *
 * Scale workers:
 *   node dist/worker.js         # Worker instance 1
 *   node dist/worker.js         # Worker instance 2
 *   node dist/worker.js         # Worker instance 3
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');

  try {
    // Create NestJS application context (no HTTP server)
    const app = await NestFactory.createApplicationContext(WorkerModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    logger.log('🚀 BullMQ Worker Process Started');
    logger.log('📊 Processing jobs from Redis queues...');
    logger.log('📈 Press Ctrl+C to stop');

    // Graceful shutdown with timeout
    const gracefulShutdown = async (signal: string) => {
      logger.log(`🛑 Received ${signal}, shutting down gracefully...`);
      
      try {
        // Give active jobs time to complete (max 30 seconds)
        const shutdownTimeout = 30000;
        const shutdownPromise = app.close();
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            logger.warn('⚠️ Shutdown timeout reached, forcing exit');
            resolve(null);
          }, shutdownTimeout);
        });

        await Promise.race([shutdownPromise, timeoutPromise]);
        logger.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Keep process alive
    await app.init();
  } catch (error) {
    logger.error('❌ Failed to start worker process:', error);
    process.exit(1);
  }
}

bootstrap();
