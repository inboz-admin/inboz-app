import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, IsDateString, IsInt, Min, IsBoolean, IsEnum } from 'class-validator';
import { EmailVerificationStatus } from '../entities/contact.entity';

/**
 * DTO for validating individual contact rows during bulk upload
 */
export class ContactRowDto {
  @IsNotEmpty({ message: 'First name is required' })
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsOptional()
  @IsString()
  list?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // Extended Contact Fields
  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsEnum(EmailVerificationStatus)
  emailVerificationStatus?: EmailVerificationStatus;

  @IsOptional()
  @IsDateString()
  lastVerifiedAt?: string;

  @IsOptional()
  @IsString()
  emailVerificationSubStatus?: string;

  // Note: 'bounced' and 'unsubscribed' already exist as 'bounceCount' and 'subscribed' (inverse)

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsString()
  creationSource?: string;

  @IsOptional()
  @IsDateString()
  lastContactedAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfOpens?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfClicks?: number;

  @IsOptional()
  @IsDateString()
  recentlyOpenDate?: string;

  @IsOptional()
  @IsDateString()
  recentlyClickDate?: string;

  @IsOptional()
  @IsDateString()
  recentlyReplyDate?: string;

  // Note: 'phoneNumber' already exists as 'phone' field

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  @IsUrl()
  linkedin?: string;

  @IsOptional()
  @IsUrl()
  twitter?: string;

  @IsOptional()
  @IsUrl()
  facebook?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  companyDomain?: string;

  @IsOptional()
  @IsUrl()
  companyWebsite?: string;

  @IsOptional()
  @IsString()
  companyIndustry?: string;

  @IsOptional()
  @IsString()
  companySize?: string;

  @IsOptional()
  @IsString()
  companyRevenue?: string;
}

/**
 * Type for cleaned/normalized row data
 */
export interface CleanedContactRow {
  firstName: string;  // Required
  lastName?: string;   // Optional
  email: string;      // Required
  list?: string;      // Contact list name
  company?: string;
  jobTitle?: string;
  phone?: string;
  
  // Extended Contact Fields - Only NEW fields that don't already exist
  timezone?: string;
  emailVerificationStatus?: EmailVerificationStatus;
  lastVerifiedAt?: string;
  emailVerificationSubStatus?: string;
  outcome?: string;
  creationSource?: string;
  lastContactedAt?: string;
  numberOfOpens?: number;
  numberOfClicks?: number;
  recentlyOpenDate?: string;
  recentlyClickDate?: string;
  recentlyReplyDate?: string;
  department?: string;
  industry?: string;
  experience?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  website?: string;
  city?: string;
  state?: string;
  country?: string;
  companyDomain?: string;
  companyWebsite?: string;
  companyIndustry?: string;
  companySize?: string;
  companyRevenue?: string;
}

/**
 * Interface for progress tracking
 */
export interface UploadProgress {
  stage: 'parsing' | 'validating' | 'deduplicating' | 'inserting' | 'list_processing' | 'completed' | 'failed';
  percentage: number;
  message: string;
  parsedCount: number;
  validRows: number;
  validationErrorCount: number;
  duplicatesInFile: number;
  duplicatesInDB: number;
  uploadedCount: number;
  restoredRows?: number; // NEW: Track restored soft-deleted contacts
  timestamp: string;
  elapsedMs?: number;
  errors?: string[];
}
