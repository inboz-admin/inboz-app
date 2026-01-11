import { IsArray, IsBoolean, IsDateString, IsEmail, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCampaignDto {
  @IsNotEmpty()
  @IsUUID()
  organizationId: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 255)
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized.replace(/\b(\p{L})(\p{L}*)/gu, (_, a: string, b: string) => a.toUpperCase() + b.toLowerCase());
  })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  contactListId?: string | null;

  @IsOptional()
  @IsEnum(['DRAFT', 'ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED'] as const)
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';

  @IsOptional()
  @IsObject()
  sequenceSettings?: any;

  @IsOptional()
  @IsInt()
  @Min(0) // Allow 0 for draft campaigns with no steps yet
  totalSteps?: number;

  @IsOptional()
  @IsBoolean()
  trackingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  openTracking?: boolean;

  @IsOptional()
  @IsBoolean()
  clickTracking?: boolean;

  @IsOptional()
  @IsBoolean()
  unsubscribeTracking?: boolean;

  @IsOptional()
  @IsBoolean()
  unsubscribeReplyEnabled?: boolean;

  @IsOptional()
  @IsString()
  unsubscribeCustomMessage?: string;

  @IsOptional()
  @IsBoolean()
  autoAdvance?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  delayBetweenSteps?: number;
}


