import { IsOptional, IsString, IsArray, IsObject } from 'class-validator';

export class BulkUploadContactsDto {
  @IsOptional()
  @IsString()
  organizationId?: string;
}

export interface BulkUploadRowError {
  row: number;
  field?: string;
  message: string;
  value?: any;
}

export interface BulkUploadContactData {
  email: string;
  firstName: string; // Required field
  lastName?: string; // Optional field
  company?: string;
  jobTitle?: string;
  phone?: string;
  source?: string;
  personalNotes?: string;
  customFields?: any;
}

export interface BulkUploadResult {
  success: boolean;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: BulkUploadRowError[];
  createdContacts: any[];
  duplicateEmails: string[];
  summary: {
    totalProcessed: number;
    successful: number;
    failed: number;
    duplicates: number;
  };
}

export interface BulkUploadValidationResult {
  isValid: boolean;
  errors: BulkUploadRowError[];
  data: BulkUploadContactData[];
}

// Remove BulkUploadResponseDto as we'll return BulkUploadResult directly
