import {
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { BaseQueryDto } from 'src/common/dto/base.query.dto';
import { ContactStatus } from '../entities/contact.entity';

export class ContactQueryDto extends BaseQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsBoolean()
  subscribed?: boolean;

  // Additional query parameters for specific operations
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsBoolean()
  phone?: boolean;

  @IsOptional()
  @IsBoolean()
  notes?: boolean;
}
