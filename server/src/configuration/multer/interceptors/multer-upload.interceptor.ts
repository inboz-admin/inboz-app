import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MulterService } from '../multer.service';
import { MulterUploadOptions } from '../decorators/multer-upload.decorator';
import {
  UploadResult,
  UploadedFile,
} from '../interfaces/multer-config.interface';
import {
  MULTER_ERROR_MESSAGES,
  MULTER_SUCCESS_MESSAGES,
} from '../constants/multer.constants';

@Injectable()
export class MulterUploadInterceptor implements NestInterceptor {
  constructor(
    private readonly multerService: MulterService,
    private readonly options: MulterUploadOptions = {},
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Get options from request metadata or use default
    const options: MulterUploadOptions =
      request.multerOptions || this.options || {};

    try {
      // Process the uploaded files
      const uploadResult: UploadResult = await this.multerService.processUpload(
        request.files || request.file,
        options,
      );

      if (!uploadResult.success) {
        throw new BadRequestException({
          message: MULTER_ERROR_MESSAGES.UPLOAD_FAILED,
          errors: uploadResult.errors,
        });
      }

      // Attach processed files to request
      request.processedFiles = uploadResult.files;

      return next.handle().pipe(
        map((data) => {
          return {
            ...data,
            uploadResult: {
              success: true,
              message:
                uploadResult.files?.length === 1
                  ? MULTER_SUCCESS_MESSAGES.SINGLE_FILE_UPLOADED
                  : MULTER_SUCCESS_MESSAGES.MULTIPLE_FILES_UPLOADED,
              files: uploadResult.files?.map((file) => ({
                fieldname: file.fieldname,
                originalname: file.originalname,
                filename: file.filename,
                mimetype: file.mimetype,
                size: file.size,
                url: file.url,
                thumbnailUrl: file.thumbnailUrl,
                metadata: file.metadata,
              })),
              totalFiles: uploadResult.files?.length || 0,
              totalSize:
                uploadResult.files?.reduce((sum, file) => sum + file.size, 0) ||
                0,
            },
          };
        }),
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: MULTER_ERROR_MESSAGES.FILE_PROCESSING_ERROR,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
