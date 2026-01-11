import { applyDecorators, UseInterceptors } from '@nestjs/common';
import {
  FileInterceptor,
  FilesInterceptor,
  AnyFilesInterceptor,
} from '@nestjs/platform-express';
import { FileType, UploadMode } from '../dto/upload-file.dto';

export interface MulterUploadOptions {
  fieldName?: string;
  fileType?: FileType;
  uploadMode?: UploadMode;
  maxFiles?: number;
  maxFileSize?: number;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
  generateThumbnail?: boolean;
  extractMetadata?: boolean;
  customPath?: string;
  overwrite?: boolean;
  filename?: string;
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxDuration?: number;
  maxPages?: number;
}

export function MulterUpload(options: MulterUploadOptions = {}) {
  const {
    fieldName = 'file',
    uploadMode = UploadMode.SINGLE,
    maxFiles = 1,
  } = options;

  if (uploadMode === UploadMode.SINGLE) {
    return applyDecorators(UseInterceptors(FileInterceptor(fieldName)));
  } else {
    return applyDecorators(
      UseInterceptors(FilesInterceptor(fieldName, maxFiles)),
    );
  }
}

export function SingleFileUpload(
  options: Omit<MulterUploadOptions, 'uploadMode' | 'maxFiles'> = {},
) {
  return MulterUpload({
    ...options,
    uploadMode: UploadMode.SINGLE,
    maxFiles: 1,
  });
}

export function MultipleFilesUpload(
  options: Omit<MulterUploadOptions, 'uploadMode'> = {},
) {
  return MulterUpload({
    ...options,
    uploadMode: UploadMode.MULTIPLE,
  });
}

export function ImageUpload(
  options: Omit<MulterUploadOptions, 'fileType'> = {},
) {
  return MulterUpload({
    ...options,
    fileType: FileType.IMAGE,
  });
}

export function VideoUpload(
  options: Omit<MulterUploadOptions, 'fileType'> = {},
) {
  return MulterUpload({
    ...options,
    fileType: FileType.VIDEO,
  });
}

export function DocumentUpload(
  options: Omit<MulterUploadOptions, 'fileType'> = {},
) {
  return MulterUpload({
    ...options,
    fileType: FileType.DOCUMENT,
  });
}

export function AudioUpload(
  options: Omit<MulterUploadOptions, 'fileType'> = {},
) {
  return MulterUpload({
    ...options,
    fileType: FileType.AUDIO,
  });
}
