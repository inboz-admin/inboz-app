import {
  IsNotEmpty,
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsUUID,
  Length,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from 'src/common/enums/roles.enum';
import { UserStatus } from '../entities/user.entity';
import { capitalizeName } from 'src/common/utils/name-transformation.util';

export class CreateUserDto {
  @IsNotEmpty()
  @IsUUID()
  organizationId: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 255)
  @Transform(({ value }) => capitalizeName(value))
  firstName: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 255)
  @Transform(({ value }) => capitalizeName(value))
  lastName: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsEnum([UserRole.USER, UserRole.ADMIN])
  role?: UserRole.USER | UserRole.ADMIN;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  settings?: any;

  @IsOptional()
  @IsString()
  socialId?: string;

  @IsOptional()
  @IsString()
  socialProvider?: string;
}
