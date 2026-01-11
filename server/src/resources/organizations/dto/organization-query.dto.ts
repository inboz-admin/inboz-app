import { IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseQueryDto } from 'src/common/dto/base.query.dto';

export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export class OrganizationQueryDto extends BaseQueryDto {
  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsEnum(OrganizationStatus)
  @Transform(({ value }) => value?.toUpperCase())
  status?: OrganizationStatus;
}
