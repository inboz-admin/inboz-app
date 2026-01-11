import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { BaseQueueService } from '../services/base-queue.service';
import { QueueName, JobType, JobPriority } from '../enums/queue.enum';
import { BullConfig } from '../config/bull.config';
import { JobOptions } from '../interfaces/queue.interface';

@Injectable()
export class CleanupQueue extends BaseQueueService implements OnModuleInit {
  protected readonly logger = new Logger(CleanupQueue.name);
  protected readonly queue: Queue;

  constructor(private readonly configService: ConfigService) {
    super();
    this.queue = BaseQueueService.createQueue(
      QueueName.CLEANUP,
      configService,
    );
  }

  async onModuleInit() {
    this.logger.log(`${QueueName.CLEANUP} initialized`);
  }

  /**
   * Schedule cleanup of old logs
   */
  async scheduleLogCleanup(maxAgeDays: number = 30): Promise<void> {
    await this.addJob(
      JobType.CLEANUP_OLD_LOGS,
      { maxAgeDays },
      {
        priority: JobPriority.LOW,
        repeat: {
          cron: '0 2 * * *', // Daily at 2 AM
        },
      },
    );
  }

  /**
   * Schedule cleanup of temp files
   */
  async scheduleTempFileCleanup(maxAgeHours: number = 24): Promise<void> {
    await this.addJob(
      JobType.CLEANUP_TEMP_FILES,
      { maxAgeHours },
      {
        priority: JobPriority.LOW,
        repeat: {
          cron: '0 */6 * * *', // Every 6 hours
        },
      },
    );
  }

  /**
   * Schedule cleanup of old jobs
   */
  async scheduleOldJobsCleanup(maxAgeHours: number = 168): Promise<void> {
    await this.addJob(
      JobType.CLEANUP_OLD_JOBS,
      { maxAgeHours },
      {
        priority: JobPriority.LOW,
        repeat: {
          cron: '0 3 * * 0', // Weekly on Sunday at 3 AM
        },
      },
    );
  }

  /**
   * Archive old data
   */
  async scheduleDataArchival(
    entityType: string,
    maxAgeDays: number = 90,
  ): Promise<void> {
    await this.addJob(
      JobType.ARCHIVE_OLD_DATA,
      { entityType, maxAgeDays },
      {
        priority: JobPriority.LOW,
        repeat: {
          cron: '0 1 1 * *', // Monthly on 1st day at 1 AM
        },
      },
    );
  }
}
