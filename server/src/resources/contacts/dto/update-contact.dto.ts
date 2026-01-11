import { PartialType } from '@nestjs/mapped-types';
import { CreateContactDto } from './create-contact.dto';
import { IsOptional, IsDateString, IsInt, Min } from 'class-validator';

export class UpdateContactDto extends PartialType(CreateContactDto) {
  @IsOptional()
  @IsDateString()
  subscribedAt?: string;

  @IsOptional()
  @IsDateString()
  unsubscribedAt?: string;

  @IsOptional()
  @IsDateString()
  lastEmailSentAt?: string;

  @IsOptional()
  @IsDateString()
  lastEmailOpenedAt?: string;

  @IsOptional()
  @IsDateString()
  lastEmailClickedAt?: string;

  @IsOptional()
  @IsDateString()
  lastVerifiedAt?: string;

  @IsOptional()
  @IsDateString()
  lastContactedAt?: string;

  @IsOptional()
  @IsDateString()
  recentlyOpenDate?: string;

  @IsOptional()
  @IsDateString()
  recentlyClickDate?: string;

  @IsOptional()
  @IsDateString()
  recentlyReplyDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfOpens?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfClicks?: number;
}
