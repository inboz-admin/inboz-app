import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateActionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
