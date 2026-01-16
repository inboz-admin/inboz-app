import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  Length,
  IsEnum,
  IsArray,
  IsObject,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { EmailTemplateType } from '../enums/email-template-type.enum';
import { EmailSendFormat } from '../enums/email-send-format.enum';

export class CreateEmailTemplateDto {
  @IsNotEmpty()
  @IsUUID()
  organizationId: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 255)
  name: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 500)
  subject: string;

  @IsOptional()
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsOptional()
  @IsString()
  plainText?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(EmailTemplateType)
  type?: EmailTemplateType;

  @IsOptional()
  @IsEnum(EmailSendFormat)
  sendFormat?: EmailSendFormat;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsObject()
  designSettings?: any;

  @IsOptional()
  @IsUUID()
  systemTemplateId?: string; // If provided, will use system template's content as defaults. This field is NOT saved to the template - it's only used during creation to fetch initial content.
}
