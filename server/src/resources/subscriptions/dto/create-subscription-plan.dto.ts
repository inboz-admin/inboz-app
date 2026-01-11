import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  Min,
  Max,
  Length,
} from 'class-validator';

export class CreateSubscriptionPlanDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Per-user pricing
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerUserMonthly?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerUserYearly?: number;

  // Plan limits
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxContacts?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxEmailsPerMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyEmailLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCampaigns?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTemplates?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUsers?: number;

  // Features
  @IsOptional()
  @IsObject()
  features?: any;

  // Plan status
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}



























