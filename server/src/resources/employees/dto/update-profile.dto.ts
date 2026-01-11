import { IsOptional, IsString, IsEmail, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { capitalizeName } from 'src/common/utils/name-transformation.util';

export class UpdateProfileDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  @Transform(({ value }) => capitalizeName(value))
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  @Transform(({ value }) => capitalizeName(value))
  lastName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  settings?: any;
}

