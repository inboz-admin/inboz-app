import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseProcessor } from './base.processor';
import { QueueName, JobType } from '../enums/queue.enum';
import { JobResult } from '../interfaces/queue.interface';
import { ExcelService } from '../../excel/excel.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Processor(QueueName.FILE_PROCESSING)
export class FileProcessingProcessor extends WorkerHost {
  protected readonly logger = new Logger(FileProcessingProcessor.name);
  private readonly baseProcessor: FileProcessingProcessorImpl;

  constructor(private readonly excelService: ExcelService) {
    super();
    this.baseProcessor = new FileProcessingProcessorImpl(excelService);
  }

  async process(job: Job): Promise<any> {
    return await this.baseProcessor.executeWithLogging(job);
  }
}

class FileProcessingProcessorImpl extends BaseProcessor {
  protected readonly logger = new Logger('FileProcessingProcessorImpl');

  constructor(private readonly excelService: ExcelService) {
    super();
  }

  async process(job: Job): Promise<JobResult> {
    switch (job.name) {
      case JobType.PROCESS_CSV_UPLOAD:
        return await this.processCsvUpload(job);
      case JobType.PROCESS_EXCEL_UPLOAD:
        return await this.processExcelUpload(job);
      case JobType.GENERATE_REPORT:
        return await this.generateReport(job);
      case JobType.EXPORT_DATA:
        return await this.exportData(job);
      default:
        return this.createErrorResult(`Unknown job type: ${job.name}`);
    }
  }

  private async processCsvUpload(job: Job): Promise<JobResult> {
    try {
      this.validateJobData(job, ['filePath', 'userId']);
      const { filePath, userId } = job.data;

      await this.updateProgress(job, 10, 'Reading file...');

      // Check if file exists
      const fileExists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);

      if (!fileExists) {
        throw new Error(`File not found: ${filePath}`);
      }

      await this.updateProgress(job, 30, 'Parsing CSV...');

      // Here you would implement actual CSV parsing logic
      // For now, this is a placeholder
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const lines = fileContent.split('\n');

      await this.updateProgress(job, 70, 'Processing records...');

      // Process the CSV data
      // This is where you'd save to database, validate, etc.

      await this.updateProgress(job, 100, 'Complete');

      return this.createSuccessResult({
        filePath,
        recordsProcessed: lines.length - 1, // excluding header
        userId,
      });
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }

  private async processExcelUpload(job: Job): Promise<JobResult> {
    try {
      this.validateJobData(job, ['filePath', 'userId']);
      const { filePath, userId } = job.data;

      await this.updateProgress(job, 10, 'Reading Excel file...');

      const fileBuffer = await fs.readFile(filePath);

      await this.updateProgress(job, 30, 'Parsing Excel...');

      const data = await this.excelService.parseExcel(fileBuffer);

      await this.updateProgress(job, 70, 'Processing records...');

      // Process the Excel data
      // This is where you'd save to database, validate, etc.

      await this.updateProgress(job, 100, 'Complete');

      return this.createSuccessResult({
        filePath,
        recordsProcessed: data.length,
        userId,
      });
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }

  private async generateReport(job: Job): Promise<JobResult> {
    try {
      this.validateJobData(job, ['reportType', 'userId']);
      const { reportType, filters, userId } = job.data;

      await this.updateProgress(job, 20, 'Fetching data...');

      // Fetch data based on report type and filters
      // This is a placeholder

      await this.updateProgress(job, 60, 'Generating report...');

      // Generate the report file
      // This would use ExcelService or PdfService

      await this.updateProgress(job, 100, 'Complete');

      return this.createSuccessResult({
        reportType,
        userId,
        generatedAt: new Date(),
      });
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }

  private async exportData(job: Job): Promise<JobResult> {
    try {
      this.validateJobData(job, ['dataType', 'format', 'userId']);
      const { dataType, filters, format, userId } = job.data;

      await this.updateProgress(job, 20, 'Fetching data...');

      // Fetch data based on type and filters
      // This is a placeholder

      await this.updateProgress(job, 60, 'Exporting data...');

      // Export to specified format
      // This would use ExcelService or PdfService

      await this.updateProgress(job, 100, 'Complete');

      return this.createSuccessResult({
        dataType,
        format,
        userId,
        exportedAt: new Date(),
      });
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }
}
