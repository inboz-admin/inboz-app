import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  ALL = 'all',
}

export enum UploadMode {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
  ARRAY = 'array',
}

export class UploadFileDto {
  @IsOptional()
  @IsString()
  fieldName?: string = 'file';

  @IsOptional()
  @IsEnum(FileType)
  fileType?: FileType = FileType.ALL;

  @IsOptional()
  @IsEnum(UploadMode)
  uploadMode?: UploadMode = UploadMode.SINGLE;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  maxFiles?: number = 1;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  maxFileSize?: number; // in bytes

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedExtensions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedMimeTypes?: string[];

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  generateThumbnail?: boolean = false;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  extractMetadata?: boolean = true;

  @IsOptional()
  @IsString()
  customPath?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  overwrite?: boolean = false;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  maxWidth?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  maxHeight?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  minWidth?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  minHeight?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  maxDuration?: number; // for videos/audio

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  maxPages?: number; // for documents
}

export class UploadResponseDto {
  success: boolean;
  message: string;
  files?: {
    fieldname: string;
    originalname: string;
    filename: string;
    mimetype: string;
    size: number;
    url: string;
    thumbnailUrl?: string;
    metadata?: {
      width?: number;
      height?: number;
      duration?: number;
      pages?: number;
      [key: string]: any;
    };
  }[];
  errors?: string[];
  totalFiles: number;
  totalSize: number;
  uploadTime: number;
}

export class FileValidationDto {
  @IsString()
  filename: string;

  @IsString()
  mimetype: string;

  @IsNumber()
  size: number;

  @IsOptional()
  @IsString()
  fieldname?: string;

  @IsOptional()
  buffer?: Buffer;

  @IsOptional()
  @IsString()
  path?: string;
}
