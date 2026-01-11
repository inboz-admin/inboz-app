import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { BaseQueryDto } from 'src/common/dto/base.query.dto';
import { UserRole } from 'src/common/enums/roles.enum';
import { UserStatus } from '../entities/user.entity';

export class UserQueryDto extends BaseQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
