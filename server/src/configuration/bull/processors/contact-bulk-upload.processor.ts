import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SimpleBulkUploadService } from 'src/resources/contacts/simple-bulk-upload.service';
import { QueueName } from '../enums/queue.enum';

/**
 * BullMQ Processor for Contact Bulk Upload
 * This allows the bulk upload to run as a background job with:
 * - Automatic retries on failure
 * - Job persistence (survives server restarts)
 * - Horizontal scaling (multiple workers)
 * - Better monitoring via Bull Board
 */
@Processor(QueueName.CONTACT_BULK_UPLOAD)
export class ContactBulkUploadProcessor extends WorkerHost {
  private readonly logger = new Logger(ContactBulkUploadProcessor.name);

  constructor(
    private readonly simpleBulkUploadService: SimpleBulkUploadService,
  ) {
    super();
    this.logger.log('ContactBulkUploadProcessor initialized');
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`🚀 Processor received job ${job.id}`);
    this.logger.log(`Job data:`, JSON.stringify(job.data, null, 2));
    const { fileId, filePath, organizationId, userId } = job.data;

    if (!fileId || !filePath || !organizationId) {
      const error = new Error(`Missing required job data: fileId=${fileId}, filePath=${filePath}, organizationId=${organizationId}`);
      this.logger.error(error.message);
      throw error;
    }

    // Normalize file path - handle both local development and Docker environments
    // Local: uploads/contacts/bulk-upload/... (relative to process.cwd())
    // Docker: /usr/src/app/uploads/contacts/bulk-upload/... (mounted volume)
    const path = require('path');
    const fs = require('fs');
    
    // First, normalize path separators (handle both Windows \ and Unix /)
    // Convert all backslashes to forward slashes for consistent processing
    const normalizedSeparators = filePath.replace(/\\/g, '/');
    
    // Extract the relative path from uploads/ directory
    let relativePath = '';
    
    // Check for uploads/ in the normalized path (case-insensitive for Windows)
    const uploadsMatch = normalizedSeparators.match(/uploads\/(.+)$/i);
    if (uploadsMatch) {
      // Extract everything after 'uploads/'
      relativePath = uploadsMatch[1];
    } else if (normalizedSeparators.includes('contacts/bulk-upload/')) {
      // If path already contains contacts/bulk-upload/, use it directly
      const contactsIndex = normalizedSeparators.indexOf('contacts/bulk-upload/');
      relativePath = normalizedSeparators.substring(contactsIndex);
    } else if (!path.isAbsolute(normalizedSeparators)) {
      // If relative path, assume it's relative to uploads/
      // Remove leading ./ and uploads/ if present
      relativePath = normalizedSeparators.replace(/^(\.\/)?(uploads\/)?/i, '');
    } else {
      // If absolute path, try to extract relative part
      // Check if it's under /usr/src/app/uploads or /app/uploads
      if (normalizedSeparators.startsWith('/usr/src/app/uploads/')) {
        relativePath = normalizedSeparators.substring('/usr/src/app/uploads/'.length);
      } else if (normalizedSeparators.startsWith('/app/uploads/')) {
        relativePath = normalizedSeparators.substring('/app/uploads/'.length);
      } else {
        // Fallback: use filename if path contains it
        const filename = path.basename(normalizedSeparators);
        if (filename.includes('.csv')) {
          relativePath = `contacts/bulk-upload/${filename}`;
        } else {
          relativePath = normalizedSeparators;
        }
      }
    }
    
    // Ensure relativePath uses forward slashes and doesn't start with uploads/
    relativePath = relativePath.replace(/\\/g, '/').replace(/^uploads\//i, '');
    
    // Detect environment: check if we're running in Docker
    // Docker: process.cwd() is /usr/src/app, and /usr/src/app/uploads exists
    // Local: process.cwd() is the project root (e.g., D:\repos\email-campaign-tool\server)
    const isDocker = process.cwd().startsWith('/usr/src/app') || fs.existsSync('/usr/src/app/uploads');
    const baseUploadsPath = isDocker 
      ? '/usr/src/app/uploads' 
      : path.join(process.cwd(), 'uploads');
    
    // Build absolute path
    let normalizedPath = path.join(baseUploadsPath, relativePath).replace(/\\/g, '/');
    
    this.logger.log(`Environment: ${isDocker ? 'Docker' : 'Local'}`);
    this.logger.log(`Original filePath: ${filePath}`);
    this.logger.log(`Extracted relativePath: ${relativePath}`);
    this.logger.log(`Base uploads path: ${baseUploadsPath}`);
    this.logger.log(`Normalized filePath: ${normalizedPath}`);
    
    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      // Try alternative paths for debugging
      const altPaths = [
        filePath,
        isDocker 
          ? path.join('/usr/src/app/uploads', relativePath)
          : path.join(process.cwd(), 'uploads', relativePath),
        path.join('/app/uploads', relativePath),
        path.join(process.cwd(), 'uploads', relativePath),
      ];
      
      this.logger.error(`File not found at normalized path: ${normalizedPath}`);
      this.logger.error(`Alternative paths tried: ${altPaths.join(', ')}`);
      
      // List directory to help debug
      const uploadsDir = path.join(baseUploadsPath, 'contacts/bulk-upload');
      if (fs.existsSync(uploadsDir)) {
        try {
          const files = fs.readdirSync(uploadsDir);
          this.logger.log(`Files in ${uploadsDir}: ${files.join(', ')}`);
        } catch (err) {
          this.logger.warn(`Could not list files in ${uploadsDir}: ${err}`);
        }
      } else {
        this.logger.warn(`Uploads directory does not exist: ${uploadsDir}`);
      }
      
      const error = new Error(`File not found: ${normalizedPath} (original: ${filePath})`);
      this.logger.error(error.message);
      throw error;
    }

    this.logger.log(
      `Processing bulk upload job ${job.id} for fileId: ${fileId}, filePath: ${normalizedPath}`,
    );

    try {
      // Update job progress
      await job.updateProgress(0);

      // Small delay to allow WebSocket connection to establish
      this.logger.log(`⏳ Waiting 2 seconds for WebSocket connection to establish...`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Emit initial progress to show processing has started
      try {
        // Access the service's private emitProgress via a workaround
        // We'll wrap the call to ensure errors are properly emitted
        await this.simpleBulkUploadService.processBulkUpload(
          fileId,
          normalizedPath,
          organizationId,
          userId,
        );
      } catch (processError) {
        // If processBulkUpload throws, it should have already emitted failure progress
        // But if it didn't (e.g., error before emit), we need to handle it
        this.logger.error('Error in processBulkUpload:', processError);
        // Re-throw to let the outer catch handle it
        throw processError;
      }

      // Mark as complete
      await job.updateProgress(100);

      this.logger.log(`Bulk upload job ${job.id} completed successfully`);

      return {
        success: true,
        fileId,
        message: 'Bulk upload completed successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : String(error);
      
      this.logger.error(
        `Bulk upload job ${job.id} failed:`,
        errorStack,
      );

      // Emit failure progress update before throwing
      // This ensures the frontend receives the error and can terminate the session
      try {
        const elapsedMs = job.timestamp ? Date.now() - job.timestamp : 0;
        // Use SimpleBulkUploadService to emit failure progress
        // This ensures the error is sent via WebSocket/Redis to the frontend
        this.simpleBulkUploadService.emitFailureProgress(fileId, errorMessage, elapsedMs);
        this.logger.log(`✅ Emitted failure progress for fileId: ${fileId}`);
      } catch (emitError) {
        this.logger.warn('Failed to emit error progress:', emitError);
        // Continue to throw the original error even if progress emission fails
      }

      throw error; // Let Bull handle retries
    }
  }
}
