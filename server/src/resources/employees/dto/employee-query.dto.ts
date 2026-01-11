import {
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { BaseQueryDto } from 'src/common/dto/base.query.dto';
import { UserRole } from 'src/common/enums/roles.enum';
import { EmployeeStatus } from '../entities/employee.entity';

export class EmployeeQueryDto extends BaseQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsEnum([UserRole.SUPERADMIN, UserRole.SUPPORT])
  role?: UserRole.SUPERADMIN | UserRole.SUPPORT;
}

