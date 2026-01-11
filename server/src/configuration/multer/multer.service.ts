import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  UploadResult,
  UploadedFile,
  MulterConfig,
} from './interfaces/multer-config.interface';
import { MulterUploadOptions } from './decorators/multer-upload.decorator';
import { FileType, UploadMode } from './dto/upload-file.dto';
import {
  FILE_TYPE_CONFIG,
  MULTER_ERROR_MESSAGES,
  DEFAULT_MULTER_CONFIG,
} from './constants/multer.constants';

@Injectable()
export class MulterService {
  private readonly logger = new Logger(MulterService.name);
  private readonly config: MulterConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      ...DEFAULT_MULTER_CONFIG,
      uploadPath: this.configService.get('UPLOAD_PATH') || 'uploads',
      maxFileSize:
        this.configService.get('MAX_FILE_SIZE') ||
        DEFAULT_MULTER_CONFIG.maxFileSize,
      maxFiles:
        this.configService.get('MAX_FILES') || DEFAULT_MULTER_CONFIG.maxFiles,
    };

    // Ensure upload directory exists
    this.ensureUploadDirectory();
  }

  async processUpload(
    files: any | any[],
    options: MulterUploadOptions,
  ): Promise<UploadResult> {
    try {
      const fileArray = Array.isArray(files) ? files : [files];

      if (!fileArray.length) {
        return {
          success: false,
          errors: [MULTER_ERROR_MESSAGES.MISSING_FILE],
        };
      }

      // Validate file count
      if (fileArray.length > (options.maxFiles || this.config.maxFiles)) {
        return {
          success: false,
          errors: [MULTER_ERROR_MESSAGES.TOO_MANY_FILES],
        };
      }

      const processedFiles: UploadedFile[] = [];
      const errors: string[] = [];

      for (const file of fileArray) {
        try {
          // Validate file
          const validationResult = await this.validateFile(file, options);
          if (!validationResult.isValid) {
            errors.push(`${file.originalname}: ${validationResult.error}`);
            continue;
          }

          // Process and store file
          const processedFile = await this.processAndStoreFile(file, options);
          processedFiles.push(processedFile);
        } catch (error) {
          this.logger.error(
            `Error processing file ${file.originalname}:`,
            error,
          );
          errors.push(
            `${file.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      return {
        success: processedFiles.length > 0,
        files: processedFiles,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      this.logger.error('Error in processUpload:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  private async validateFile(
    file: any,
    options: MulterUploadOptions,
  ): Promise<{ isValid: boolean; error?: string }> {
    // Check file size
    const maxSize = options.maxFileSize || this.config.maxFileSize;
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: MULTER_ERROR_MESSAGES.FILE_TOO_LARGE,
      };
    }

    // Check file type
    const allowedMimeTypes = this.getAllowedMimeTypes(options);
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        error: MULTER_ERROR_MESSAGES.INVALID_FILE_TYPE,
      };
    }

    // Check file extension
    const allowedExtensions = this.getAllowedExtensions(options);
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        error: MULTER_ERROR_MESSAGES.INVALID_FILE_EXTENSION,
      };
    }

    return { isValid: true };
  }

  private async processAndStoreFile(
    file: any,
    options: MulterUploadOptions,
  ): Promise<UploadedFile> {
    // Generate unique filename
    const filename = this.generateUniqueFilename(
      file.originalname,
      options.filename,
    );

    // Determine upload path
    const uploadPath = this.getUploadPath(options);
    const filePath = path.join(uploadPath, filename);

    // Ensure directory exists
    await this.ensureDirectoryExists(uploadPath);

    // Write file to disk
    await this.writeFileToDisk(file, filePath);

    // Generate file URL
    const fileUrl = this.generateFileUrl(filename, uploadPath);

    return {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      size: file.size,
      destination: uploadPath,
      filename,
      path: filePath,
      url: fileUrl,
      thumbnailUrl: undefined,
      metadata: {},
    };
  }

  private generateUniqueFilename(
    originalname: string,
    customName?: string,
  ): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalname);
    const baseName = customName || path.basename(originalname, extension);

    return `${baseName}_${timestamp}_${randomString}${extension}`;
  }

  private getUploadPath(options: MulterUploadOptions): string {
    const basePath = this.config.uploadPath;
    const customPath = options.customPath || '';

    if (customPath) {
      // For custom paths (like organization logos), don't add date subfolder
      return path.join(basePath, customPath);
    }

    // For general uploads, add date subfolder
    const datePath = new Date().toISOString().split('T')[0].replace(/-/g, '/');
    return path.join(basePath, datePath);
  }

  private async writeFileToDisk(file: any, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (file.buffer) {
        fs.writeFile(filePath, file.buffer, (err) => {
          if (err) reject(err);
          else resolve();
        });
      } else if (file.path) {
        fs.copyFile(file.path, filePath, (err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        reject(new Error('No file data available'));
      }
    });
  }

  private generateFileUrl(filename: string, uploadPath: string): string {
    const baseUrl =
      this.configService.get('BASE_URL') || 'http://localhost:4000';
    const relativePath = path.relative(this.config.uploadPath, uploadPath);
    // Normalize path separators for URL
    const normalizedPath = relativePath.replace(/\\/g, '/');
    return `${baseUrl}/uploads/${normalizedPath}/${filename}`;
  }

  private getAllowedMimeTypes(options: MulterUploadOptions): string[] {
    if (options.allowedMimeTypes) {
      return options.allowedMimeTypes;
    }

    if (
      options.fileType &&
      options.fileType !== FileType.ALL &&
      FILE_TYPE_CONFIG[options.fileType]
    ) {
      return FILE_TYPE_CONFIG[options.fileType].mimeTypes;
    }

    return this.config.allowedMimeTypes;
  }

  private getAllowedExtensions(options: MulterUploadOptions): string[] {
    if (options.allowedExtensions) {
      return options.allowedExtensions;
    }

    if (
      options.fileType &&
      options.fileType !== FileType.ALL &&
      FILE_TYPE_CONFIG[options.fileType]
    ) {
      return FILE_TYPE_CONFIG[options.fileType].extensions;
    }

    return this.config.allowedExtensions;
  }

  private getFileType(mimetype: string): FileType {
    if (FILE_TYPE_CONFIG.images.mimeTypes.includes(mimetype)) {
      return FileType.IMAGE;
    } else if (FILE_TYPE_CONFIG.videos.mimeTypes.includes(mimetype)) {
      return FileType.VIDEO;
    } else if (FILE_TYPE_CONFIG.documents.mimeTypes.includes(mimetype)) {
      return FileType.DOCUMENT;
    } else if (FILE_TYPE_CONFIG.audio.mimeTypes.includes(mimetype)) {
      return FileType.AUDIO;
    }
    return FileType.ALL;
  }

  private ensureUploadDirectory(): void {
    const uploadDir = path.resolve(this.config.uploadPath);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}
