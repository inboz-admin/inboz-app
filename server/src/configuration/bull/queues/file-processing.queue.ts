import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { BaseQueueService } from '../services/base-queue.service';
import { QueueName, JobType, JobPriority } from '../enums/queue.enum';
import { BullConfig } from '../config/bull.config';
import { JobOptions } from '../interfaces/queue.interface';

@Injectable()
export class FileProcessingQueue
  extends BaseQueueService
  implements OnModuleInit
{
  protected readonly logger = new Logger(FileProcessingQueue.name);
  protected readonly queue: Queue;

  constructor(private readonly configService: ConfigService) {
    super();
    this.queue = BaseQueueService.createQueue(
      QueueName.FILE_PROCESSING,
      configService,
    );
  }

  async onModuleInit() {
    this.logger.log(`${QueueName.FILE_PROCESSING} initialized`);
  }

  /**
   * Process CSV upload
   */
  async processCsvUpload(
    filePath: string,
    userId: string,
    options?: JobOptions,
  ): Promise<void> {
    await this.addJob(
      JobType.PROCESS_CSV_UPLOAD,
      { filePath, userId },
      {
        priority: JobPriority.HIGH,
        timeout: 300000, // 5 minutes
        ...options,
      },
    );
  }

  /**
   * Process Excel upload
   */
  async processExcelUpload(
    filePath: string,
    userId: string,
    options?: JobOptions,
  ): Promise<void> {
    await this.addJob(
      JobType.PROCESS_EXCEL_UPLOAD,
      { filePath, userId },
      {
        priority: JobPriority.HIGH,
        timeout: 300000, // 5 minutes
        ...options,
      },
    );
  }

  /**
   * Generate report
   */
  async generateReport(
    reportType: string,
    filters: any,
    userId: string,
    options?: JobOptions,
  ): Promise<void> {
    await this.addJob(
      JobType.GENERATE_REPORT,
      { reportType, filters, userId },
      {
        priority: JobPriority.NORMAL,
        timeout: 600000, // 10 minutes
        ...options,
      },
    );
  }

  /**
   * Export data
   */
  async exportData(
    dataType: string,
    filters: any,
    format: 'csv' | 'excel' | 'pdf',
    userId: string,
    options?: JobOptions,
  ): Promise<void> {
    await this.addJob(
      JobType.EXPORT_DATA,
      { dataType, filters, format, userId },
      {
        priority: JobPriority.NORMAL,
        timeout: 600000, // 10 minutes
        ...options,
      },
    );
  }
}
