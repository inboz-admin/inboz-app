import { IsNotEmpty, IsOptional, IsString, IsUUID, IsDateString, Length, IsNumber, Min, IsEnum } from 'class-validator';
import { STANDARD_TIMEZONES } from 'src/common/constants/timezones.constant';

export class CreateStepDto {
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty({ message: 'Email template is required' })
  @IsUUID(undefined, { message: 'Template ID must be a valid UUID' })
  templateId: string;

  @IsOptional()
  @IsString()
  triggerType?: 'IMMEDIATE' | 'SCHEDULE';

  @IsOptional()
  @IsDateString({}, { message: 'Schedule time must be a valid ISO date string' })
  scheduleTime?: string;

  @IsNotEmpty()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Delay must be a valid number' })
  @Min(0.5, { message: 'Delay must be at least 0.5 minutes' })
  delayMinutes: number;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsUUID()
  replyToStepId?: string | null;

  @IsOptional()
  @IsEnum(['OPENED', 'CLICKED'])
  replyType?: 'OPENED' | 'CLICKED' | null;
}


