import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  Length,
  IsEnum,
  IsBoolean,
  IsObject,
  IsUrl,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ContactStatus, EmailVerificationStatus } from '../entities/contact.entity';

export class CreateContactDto {
  @IsNotEmpty()
  @IsUUID()
  organizationId: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(' ')
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(' ');
    }
    return value;
  })
  firstName: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(' ')
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(' ');
    }
    return value;
  })
  lastName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  company?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  jobTitle?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  source?: string;

  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @IsOptional()
  @IsBoolean()
  subscribed?: boolean;

  @IsOptional()
  @IsObject()
  customFields?: any;

  @IsOptional()
  @IsString()
  personalNotes?: string;

  // Extended Contact Fields
  @IsOptional()
  @IsString()
  @Length(1, 100)
  timezone?: string;

  @IsOptional()
  @IsEnum(EmailVerificationStatus)
  emailVerificationStatus?: EmailVerificationStatus;

  @IsOptional()
  @IsDateString()
  lastVerifiedAt?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  emailVerificationSubStatus?: string;

  // Note: 'bounced' and 'unsubscribed' already exist as 'bounceCount' and 'subscribed' (inverse)

  @IsOptional()
  @IsString()
  @Length(1, 100)
  outcome?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
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
  @Length(1, 255)
  department?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  industry?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  experience?: string;

  @IsOptional()
  @IsUrl()
  @Length(1, 500)
  linkedin?: string;

  @IsOptional()
  @IsUrl()
  @Length(1, 500)
  twitter?: string;

  @IsOptional()
  @IsUrl()
  @Length(1, 500)
  facebook?: string;

  @IsOptional()
  @IsUrl()
  @Length(1, 500)
  website?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  state?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  country?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  companyDomain?: string;

  @IsOptional()
  @IsUrl()
  @Length(1, 500)
  companyWebsite?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  companyIndustry?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  companySize?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  companyRevenue?: string;
}

