import {
  IsNotEmpty,
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  Length,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from 'src/common/enums/roles.enum';
import { EmployeeStatus } from '../entities/employee.entity';
import { capitalizeName } from 'src/common/utils/name-transformation.util';

export class CreateEmployeeDto {
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

  @IsNotEmpty()
  @IsEnum([UserRole.SUPERADMIN, UserRole.SUPPORT])
  role: UserRole.SUPERADMIN | UserRole.SUPPORT;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  settings?: any;
}

