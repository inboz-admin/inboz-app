import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseProcessor } from './base.processor';
import { QueueName, JobType } from '../enums/queue.enum';
import { JobResult } from '../interfaces/queue.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

@Processor(QueueName.CLEANUP)
export class CleanupProcessor extends WorkerHost {
  protected readonly logger = new Logger(CleanupProcessor.name);
  private readonly baseProcessor: CleanupProcessorImpl;

  constructor() {
    super();
    this.baseProcessor = new CleanupProcessorImpl();
  }

  async process(job: Job): Promise<any> {
    return await this.baseProcessor.executeWithLogging(job);
  }
}

class CleanupProcessorImpl extends BaseProcessor {
  protected readonly logger = new Logger('CleanupProcessorImpl');

  async process(job: Job): Promise<JobResult> {
    switch (job.name) {
      case JobType.CLEANUP_OLD_LOGS:
        return await this.cleanupOldLogs(job);
      case JobType.CLEANUP_TEMP_FILES:
        return await this.cleanupTempFiles(job);
      case JobType.CLEANUP_OLD_JOBS:
        return await this.cleanupOldJobs(job);
      case JobType.ARCHIVE_OLD_DATA:
        return await this.archiveOldData(job);
      default:
        return this.createErrorResult(`Unknown job type: ${job.name}`);
    }
  }

  private async cleanupOldLogs(job: Job): Promise<JobResult> {
    try {
      const { maxAgeDays = 30 } = job.data;
      const logsDir = path.join(process.cwd(), 'logs');

      await this.updateProgress(job, 20, 'Scanning log files...');

      let deletedCount = 0;
      let freedSpace = 0;

      try {
        const files = await fs.readdir(logsDir);
        const cutoffTime = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

        for (const file of files) {
          const filePath = path.join(logsDir, file);
          const stats = await fs.stat(filePath);

          if (stats.mtimeMs < cutoffTime) {
            freedSpace += stats.size;
            await fs.unlink(filePath);
            deletedCount++;
          }
        }
      } catch (error: any) {
        // Directory might not exist, that's OK
        this.logger.log('Logs directory not found or empty');
      }

      await this.updateProgress(job, 100, 'Complete');

      return this.createSuccessResult({
        deletedCount,
        freedSpaceMB: (freedSpace / 1024 / 1024).toFixed(2),
        maxAgeDays,
      });
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }

  private async cleanupTempFiles(job: Job): Promise<JobResult> {
    try {
      const { maxAgeHours = 24 } = job.data;
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');

      await this.updateProgress(job, 20, 'Scanning temp files...');

      let deletedCount = 0;
      let freedSpace = 0;

      try {
        const files = await fs.readdir(tempDir);
        const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000;

        for (const file of files) {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);

          if (stats.mtimeMs < cutoffTime) {
            freedSpace += stats.size;
            await fs.unlink(filePath);
            deletedCount++;
          }
        }
      } catch (error: any) {
        // Directory might not exist, that's OK
        this.logger.log('Temp directory not found or empty');
      }

      await this.updateProgress(job, 100, 'Complete');

      return this.createSuccessResult({
        deletedCount,
        freedSpaceMB: (freedSpace / 1024 / 1024).toFixed(2),
        maxAgeHours,
      });
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }

  private async cleanupOldJobs(job: Job): Promise<JobResult> {
    try {
      const { maxAgeHours = 168 } = job.data;

      // This would clean up job data from Redis
      // BullMQ handles this with removeOnComplete/removeOnFail options
      // This is a placeholder for custom cleanup logic

      await this.updateProgress(job, 50, 'Cleaning up old jobs...');

      // Simulate cleanup
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await this.updateProgress(job, 100, 'Complete');

      return this.createSuccessResult({
        maxAgeHours,
        cleanedAt: new Date(),
      });
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }

  private async archiveOldData(job: Job): Promise<JobResult> {
    try {
      this.validateJobData(job, ['entityType', 'maxAgeDays']);
      const { entityType, maxAgeDays } = job.data;

      await this.updateProgress(job, 20, 'Identifying old data...');

      // This would implement actual archival logic
      // Moving old data to archive tables or external storage

      await this.updateProgress(job, 60, 'Archiving data...');

      // Simulate archival
      await new Promise((resolve) => setTimeout(resolve, 3000));

      await this.updateProgress(job, 100, 'Complete');

      return this.createSuccessResult({
        entityType,
        maxAgeDays,
        archivedAt: new Date(),
      });
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }
}
