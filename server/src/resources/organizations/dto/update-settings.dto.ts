import { IsObject, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}

