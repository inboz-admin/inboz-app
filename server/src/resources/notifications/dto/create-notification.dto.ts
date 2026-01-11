import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';
import { NotificationType } from 'src/common/enums/notification-type.enum';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsOptional()
  userId?: string | null;

  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsObject()
  @IsOptional()
  data?: any;
}

