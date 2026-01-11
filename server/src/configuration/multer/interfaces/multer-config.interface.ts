export interface FileValidationRule {
  maxSize?: number; // in bytes
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

export interface MulterConfig {
  uploadPath: string;
  maxFileSize: number; // in bytes
  maxFiles: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  imageValidation?: {
    maxWidth?: number;
    maxHeight?: number;
    minWidth?: number;
    minHeight?: number;
  };
  videoValidation?: {
    maxDuration?: number; // in seconds
    maxBitrate?: number; // in bits per second
  };
  documentValidation?: {
    maxPages?: number;
  };
  customValidation?: {
    [key: string]: FileValidationRule;
  };
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
  stream?: any;
  url?: string;
  thumbnailUrl?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    pages?: number;
    [key: string]: any;
  };
}

export interface UploadResult {
  success: boolean;
  files?: UploadedFile[];
  errors?: string[];
  message?: string;
}

export interface FileTypeConfig {
  images: {
    mimeTypes: string[];
    extensions: string[];
    maxSize: number;
    validation?: {
      maxWidth?: number;
      maxHeight?: number;
      minWidth?: number;
      minHeight?: number;
    };
  };
  videos: {
    mimeTypes: string[];
    extensions: string[];
    maxSize: number;
    validation?: {
      maxDuration?: number;
      maxBitrate?: number;
    };
  };
  documents: {
    mimeTypes: string[];
    extensions: string[];
    maxSize: number;
    validation?: {
      maxPages?: number;
    };
  };
  audio: {
    mimeTypes: string[];
    extensions: string[];
    maxSize: number;
    validation?: {
      maxDuration?: number;
    };
  };
}
