import { IsOptional, IsDate } from 'class-validator';

export class UpdateNotificationDto {
  @IsOptional()
  @IsDate()
  readAt?: Date;
}

