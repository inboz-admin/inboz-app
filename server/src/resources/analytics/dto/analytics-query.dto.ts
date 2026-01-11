import { IsOptional, IsDateString, IsUUID, IsInt, Min, IsArray, IsString } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string; // Optional from UI, will be set server-side if not provided

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // Handle comma-separated string (e.g., "ACTIVE,COMPLETED,PAUSED")
      return value.split(',').map(s => s.trim());
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [value];
  })
  status?: string[]; // For filtering campaigns by status

  @IsOptional()
  @IsUUID()
  userId?: string; // Filter analytics by specific user (campaigns created by this user)

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  platformView?: boolean; // Platform-wide view (SUPERADMIN only) - aggregates across all organizations
}

