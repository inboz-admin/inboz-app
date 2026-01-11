import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class UpdateStepDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}


