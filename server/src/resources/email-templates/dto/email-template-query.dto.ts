import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { BaseQueryDto } from 'src/common/dto/base.query.dto';
import { EmailTemplateType } from '../enums/email-template-type.enum';

export class EmailTemplateQueryDto extends BaseQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(EmailTemplateType)
  type?: EmailTemplateType;
}
