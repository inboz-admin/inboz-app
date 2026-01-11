import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { MulterService } from './multer.service';
import {
  UploadFileDto,
  UploadResponseDto,
  FileType,
  UploadMode,
} from './dto/upload-file.dto';
import {
  MULTER_ERROR_MESSAGES,
  MULTER_SUCCESS_MESSAGES,
} from './constants/multer.constants';
import * as fs from 'fs';
import * as path from 'path';

// Add multer types
declare module 'express-serve-static-core' {
  interface Request {
    file?: any;
    files?: any;
  }
}

@Controller('upload')
export class MulterController {
  constructor(private readonly multerService: MulterService) {}

  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingleFile(
    @UploadedFile() file: any,
    @Query() query: UploadFileDto,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException(MULTER_ERROR_MESSAGES.MISSING_FILE);
    }

    const uploadResult = await this.multerService.processUpload(file, {
      fieldName: query.fieldName,
      fileType: query.fileType,
      maxFileSize: query.maxFileSize,
      allowedExtensions: query.allowedExtensions,
      allowedMimeTypes: query.allowedMimeTypes,
      generateThumbnail: query.generateThumbnail,
      extractMetadata: query.extractMetadata,
      customPath: query.customPath,
      overwrite: query.overwrite,
      filename: query.filename,
      maxWidth: query.maxWidth,
      maxHeight: query.maxHeight,
      minWidth: query.minWidth,
      minHeight: query.minHeight,
      maxDuration: query.maxDuration,
      maxPages: query.maxPages,
    });

    if (!uploadResult.success) {
      throw new BadRequestException({
        message: MULTER_ERROR_MESSAGES.UPLOAD_FAILED,
        errors: uploadResult.errors,
      });
    }

    const uploadedFile = uploadResult.files[0];
    return {
      success: true,
      message: MULTER_SUCCESS_MESSAGES.SINGLE_FILE_UPLOADED,
      files: [
        {
          fieldname: uploadedFile.fieldname,
          originalname: uploadedFile.originalname,
          filename: uploadedFile.filename,
          mimetype: uploadedFile.mimetype,
          size: uploadedFile.size,
          url: uploadedFile.url,
          thumbnailUrl: uploadedFile.thumbnailUrl,
          metadata: uploadedFile.metadata,
        },
      ],
      totalFiles: 1,
      totalSize: uploadedFile.size,
      uploadTime: Date.now(),
    };
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleFiles(
    @UploadedFiles() files: any[],
    @Query() query: UploadFileDto,
  ): Promise<UploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException(MULTER_ERROR_MESSAGES.MISSING_FILE);
    }

    const uploadResult = await this.multerService.processUpload(files, {
      fieldName: query.fieldName,
      fileType: query.fileType,
      uploadMode: UploadMode.MULTIPLE,
      maxFiles: query.maxFiles,
      maxFileSize: query.maxFileSize,
      allowedExtensions: query.allowedExtensions,
      allowedMimeTypes: query.allowedMimeTypes,
      generateThumbnail: query.generateThumbnail,
      extractMetadata: query.extractMetadata,
      customPath: query.customPath,
      overwrite: query.overwrite,
      filename: query.filename,
      maxWidth: query.maxWidth,
      maxHeight: query.maxHeight,
      minWidth: query.minWidth,
      minHeight: query.minHeight,
      maxDuration: query.maxDuration,
      maxPages: query.maxPages,
    });

    if (!uploadResult.success) {
      throw new BadRequestException({
        message: MULTER_ERROR_MESSAGES.UPLOAD_FAILED,
        errors: uploadResult.errors,
      });
    }

    return {
      success: true,
      message: MULTER_SUCCESS_MESSAGES.MULTIPLE_FILES_UPLOADED,
      files: uploadResult.files.map((file) => ({
        fieldname: file.fieldname,
        originalname: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        url: file.url,
        thumbnailUrl: file.thumbnailUrl,
        metadata: file.metadata,
      })),
      totalFiles: uploadResult.files.length,
      totalSize: uploadResult.files.reduce((sum, file) => sum + file.size, 0),
      uploadTime: Date.now(),
    };
  }

  @Post('image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile() file: any,
    @Query() query: UploadFileDto,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException(MULTER_ERROR_MESSAGES.MISSING_FILE);
    }

    const uploadResult = await this.multerService.processUpload(file, {
      fieldName: query.fieldName || 'image',
      fileType: FileType.IMAGE,
      maxFileSize: query.maxFileSize,
      generateThumbnail: query.generateThumbnail !== false,
      extractMetadata: query.extractMetadata !== false,
      customPath: query.customPath,
      overwrite: query.overwrite,
      filename: query.filename,
      maxWidth: query.maxWidth,
      maxHeight: query.maxHeight,
      minWidth: query.minWidth,
      minHeight: query.minHeight,
    });

    if (!uploadResult.success) {
      throw new BadRequestException({
        message: MULTER_ERROR_MESSAGES.UPLOAD_FAILED,
        errors: uploadResult.errors,
      });
    }

    const uploadedFile = uploadResult.files[0];
    return {
      success: true,
      message: MULTER_SUCCESS_MESSAGES.SINGLE_FILE_UPLOADED,
      files: [
        {
          fieldname: uploadedFile.fieldname,
          originalname: uploadedFile.originalname,
          filename: uploadedFile.filename,
          mimetype: uploadedFile.mimetype,
          size: uploadedFile.size,
          url: uploadedFile.url,
          thumbnailUrl: uploadedFile.thumbnailUrl,
          metadata: uploadedFile.metadata,
        },
      ],
      totalFiles: 1,
      totalSize: uploadedFile.size,
      uploadTime: Date.now(),
    };
  }

  @Post('video')
  @UseInterceptors(FileInterceptor('video'))
  async uploadVideo(
    @UploadedFile() file: any,
    @Query() query: UploadFileDto,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException(MULTER_ERROR_MESSAGES.MISSING_FILE);
    }

    const uploadResult = await this.multerService.processUpload(file, {
      fieldName: query.fieldName || 'video',
      fileType: FileType.VIDEO,
      maxFileSize: query.maxFileSize,
      extractMetadata: query.extractMetadata !== false,
      customPath: query.customPath,
      overwrite: query.overwrite,
      filename: query.filename,
      maxDuration: query.maxDuration,
    });

    if (!uploadResult.success) {
      throw new BadRequestException({
        message: MULTER_ERROR_MESSAGES.UPLOAD_FAILED,
        errors: uploadResult.errors,
      });
    }

    const uploadedFile = uploadResult.files[0];
    return {
      success: true,
      message: MULTER_SUCCESS_MESSAGES.SINGLE_FILE_UPLOADED,
      files: [
        {
          fieldname: uploadedFile.fieldname,
          originalname: uploadedFile.originalname,
          filename: uploadedFile.filename,
          mimetype: uploadedFile.mimetype,
          size: uploadedFile.size,
          url: uploadedFile.url,
          thumbnailUrl: uploadedFile.thumbnailUrl,
          metadata: uploadedFile.metadata,
        },
      ],
      totalFiles: 1,
      totalSize: uploadedFile.size,
      uploadTime: Date.now(),
    };
  }

  @Post('document')
  @UseInterceptors(FileInterceptor('document'))
  async uploadDocument(
    @UploadedFile() file: any,
    @Query() query: UploadFileDto,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException(MULTER_ERROR_MESSAGES.MISSING_FILE);
    }

    const uploadResult = await this.multerService.processUpload(file, {
      fieldName: query.fieldName || 'document',
      fileType: FileType.DOCUMENT,
      maxFileSize: query.maxFileSize,
      extractMetadata: query.extractMetadata !== false,
      customPath: query.customPath,
      overwrite: query.overwrite,
      filename: query.filename,
      maxPages: query.maxPages,
    });

    if (!uploadResult.success) {
      throw new BadRequestException({
        message: MULTER_ERROR_MESSAGES.UPLOAD_FAILED,
        errors: uploadResult.errors,
      });
    }

    const uploadedFile = uploadResult.files[0];
    return {
      success: true,
      message: MULTER_SUCCESS_MESSAGES.SINGLE_FILE_UPLOADED,
      files: [
        {
          fieldname: uploadedFile.fieldname,
          originalname: uploadedFile.originalname,
          filename: uploadedFile.filename,
          mimetype: uploadedFile.mimetype,
          size: uploadedFile.size,
          url: uploadedFile.url,
          thumbnailUrl: uploadedFile.thumbnailUrl,
          metadata: uploadedFile.metadata,
        },
      ],
      totalFiles: 1,
      totalSize: uploadedFile.size,
      uploadTime: Date.now(),
    };
  }

  @Post('audio')
  @UseInterceptors(FileInterceptor('audio'))
  async uploadAudio(
    @UploadedFile() file: any,
    @Query() query: UploadFileDto,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException(MULTER_ERROR_MESSAGES.MISSING_FILE);
    }

    const uploadResult = await this.multerService.processUpload(file, {
      fieldName: query.fieldName || 'audio',
      fileType: FileType.AUDIO,
      maxFileSize: query.maxFileSize,
      extractMetadata: query.extractMetadata !== false,
      customPath: query.customPath,
      overwrite: query.overwrite,
      filename: query.filename,
      maxDuration: query.maxDuration,
    });

    if (!uploadResult.success) {
      throw new BadRequestException({
        message: MULTER_ERROR_MESSAGES.UPLOAD_FAILED,
        errors: uploadResult.errors,
      });
    }

    const uploadedFile = uploadResult.files[0];
    return {
      success: true,
      message: MULTER_SUCCESS_MESSAGES.SINGLE_FILE_UPLOADED,
      files: [
        {
          fieldname: uploadedFile.fieldname,
          originalname: uploadedFile.originalname,
          filename: uploadedFile.filename,
          mimetype: uploadedFile.mimetype,
          size: uploadedFile.size,
          url: uploadedFile.url,
          thumbnailUrl: uploadedFile.thumbnailUrl,
          metadata: uploadedFile.metadata,
        },
      ],
      totalFiles: 1,
      totalSize: uploadedFile.size,
      uploadTime: Date.now(),
    };
  }

  @Get('file/:filename')
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    try {
      // This is a basic implementation - in production, you might want to add more security
      const filePath = path.join(process.cwd(), 'uploads', filename);

      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('File not found');
      }

      res.sendFile(filePath);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error serving file');
    }
  }

  @Delete('file/:filename')
  async deleteFile(@Param('filename') filename: string) {
    try {
      const filePath = path.join(process.cwd(), 'uploads', filename);

      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('File not found');
      }

      fs.unlinkSync(filePath);

      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error deleting file');
    }
  }

  @Get('supported-formats')
  async getSupportedFormats() {
    return {
      images: {
        mimeTypes: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/bmp',
          'image/tiff',
          'image/svg+xml',
        ],
        extensions: [
          '.jpg',
          '.jpeg',
          '.png',
          '.gif',
          '.webp',
          '.bmp',
          '.tiff',
          '.svg',
        ],
        maxSize: '10MB',
      },
      videos: {
        mimeTypes: [
          'video/mp4',
          'video/avi',
          'video/mov',
          'video/wmv',
          'video/flv',
          'video/webm',
          'video/mkv',
          'video/3gp',
        ],
        extensions: [
          '.mp4',
          '.avi',
          '.mov',
          '.wmv',
          '.flv',
          '.webm',
          '.mkv',
          '.3gp',
        ],
        maxSize: '100MB',
      },
      documents: {
        mimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'text/csv',
        ],
        extensions: [
          '.pdf',
          '.doc',
          '.docx',
          '.xls',
          '.xlsx',
          '.ppt',
          '.pptx',
          '.txt',
          '.csv',
        ],
        maxSize: '25MB',
      },
      audio: {
        mimeTypes: [
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/ogg',
          'audio/aac',
          'audio/flac',
          'audio/m4a',
        ],
        extensions: ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a'],
        maxSize: '50MB',
      },
    };
  }
}
