import { IsOptional, IsString, IsUUID } from 'class-validator';
import { BaseQueryDto } from 'src/common/dto/base.query.dto';

export class AssetQueryDto extends BaseQueryDto {
  @IsOptional()
  @IsString()
  searchTerm?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
