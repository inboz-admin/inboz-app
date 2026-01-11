import { PartialType } from '@nestjs/mapped-types';
import { CreateEmailTemplateDto } from './create-email-template.dto';
import { IsOptional, IsDateString, IsInt, Min } from 'class-validator';

export class UpdateEmailTemplateDto extends PartialType(CreateEmailTemplateDto) {
  @IsOptional()
  @IsInt()
  @Min(0)
  usageCount?: number;

  @IsOptional()
  @IsDateString()
  lastUsedAt?: string;
}
