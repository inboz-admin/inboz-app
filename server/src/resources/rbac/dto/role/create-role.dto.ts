import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { PermissionStructure } from 'src/common/interfaces/rbac.interface';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsNotEmpty()
  permissions: PermissionStructure;
}
