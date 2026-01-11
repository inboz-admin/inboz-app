import { FileTypeConfig } from '../interfaces/multer-config.interface';

export const FILE_TYPE_CONFIG: FileTypeConfig = {
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
    maxSize: 10 * 1024 * 1024, // 10MB
    validation: {
      maxWidth: 4096,
      maxHeight: 4096,
      minWidth: 50,
      minHeight: 50,
    },
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
    maxSize: 100 * 1024 * 1024, // 100MB
    validation: {
      maxDuration: 300, // 5 minutes
      maxBitrate: 5000000, // 5 Mbps
    },
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
    maxSize: 25 * 1024 * 1024, // 25MB
    validation: {
      maxPages: 100,
    },
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
    maxSize: 50 * 1024 * 1024, // 50MB
    validation: {
      maxDuration: 600, // 10 minutes
    },
  },
};

export const MULTER_ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed limit',
  INVALID_FILE_TYPE: 'File type is not allowed',
  INVALID_FILE_EXTENSION: 'File extension is not allowed',
  TOO_MANY_FILES: 'Too many files uploaded',
  INVALID_IMAGE_DIMENSIONS: 'Image dimensions are not within allowed range',
  INVALID_VIDEO_DURATION: 'Video duration exceeds the maximum allowed limit',
  INVALID_VIDEO_BITRATE: 'Video bitrate exceeds the maximum allowed limit',
  INVALID_DOCUMENT_PAGES: 'Document has too many pages',
  INVALID_AUDIO_DURATION: 'Audio duration exceeds the maximum allowed limit',
  UPLOAD_FAILED: 'File upload failed',
  FILE_PROCESSING_ERROR: 'Error processing file',
  STORAGE_ERROR: 'Error storing file',
  VALIDATION_ERROR: 'File validation failed',
  UNSUPPORTED_FILE_TYPE: 'Unsupported file type',
  MISSING_FILE: 'No file provided',
  INVALID_FIELD_NAME: 'Invalid field name',
  DUPLICATE_FILE: 'Duplicate file detected',
  CORRUPTED_FILE: 'File appears to be corrupted',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions to upload file',
} as const;

export const MULTER_SUCCESS_MESSAGES = {
  UPLOAD_SUCCESS: 'Files uploaded successfully',
  SINGLE_FILE_UPLOADED: 'File uploaded successfully',
  MULTIPLE_FILES_UPLOADED: 'Files uploaded successfully',
  FILE_PROCESSED: 'File processed successfully',
  THUMBNAIL_GENERATED: 'Thumbnail generated successfully',
  METADATA_EXTRACTED: 'File metadata extracted successfully',
} as const;

export const DEFAULT_MULTER_CONFIG = {
  uploadPath: 'uploads',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 10,
  allowedMimeTypes: [
    ...FILE_TYPE_CONFIG.images.mimeTypes,
    ...FILE_TYPE_CONFIG.videos.mimeTypes,
    ...FILE_TYPE_CONFIG.documents.mimeTypes,
    ...FILE_TYPE_CONFIG.audio.mimeTypes,
  ],
  allowedExtensions: [
    ...FILE_TYPE_CONFIG.images.extensions,
    ...FILE_TYPE_CONFIG.videos.extensions,
    ...FILE_TYPE_CONFIG.documents.extensions,
    ...FILE_TYPE_CONFIG.audio.extensions,
  ],
};

export const FILE_SIZE_LIMITS = {
  SMALL: 1 * 1024 * 1024, // 1MB
  MEDIUM: 10 * 1024 * 1024, // 10MB
  LARGE: 100 * 1024 * 1024, // 100MB
  XLARGE: 500 * 1024 * 1024, // 500MB
} as const;

export const IMAGE_DIMENSIONS = {
  THUMBNAIL: { width: 150, height: 150 },
  SMALL: { width: 300, height: 300 },
  MEDIUM: { width: 800, height: 600 },
  LARGE: { width: 1920, height: 1080 },
  MAX: { width: 4096, height: 4096 },
} as const;

export const SUPPORTED_IMAGE_FORMATS = [
  'jpeg',
  'jpg',
  'png',
  'gif',
  'webp',
  'bmp',
  'tiff',
] as const;
export const SUPPORTED_VIDEO_FORMATS = [
  'mp4',
  'avi',
  'mov',
  'wmv',
  'flv',
  'webm',
  'mkv',
] as const;
export const SUPPORTED_DOCUMENT_FORMATS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
] as const;
export const SUPPORTED_AUDIO_FORMATS = [
  'mp3',
  'wav',
  'ogg',
  'aac',
  'flac',
  'm4a',
] as const;
