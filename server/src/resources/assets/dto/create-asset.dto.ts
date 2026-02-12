import { IsNotEmpty, IsString, IsOptional, IsInt, IsUrl, MaxLength } from 'class-validator';

export class CreateAssetDto {
  @IsNotEmpty()
  @IsUrl({ require_tld: false }) // Allow localhost URLs from dev uploads
  @MaxLength(2048)
  url: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  filename: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  originalname: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimetype?: string;

  @IsOptional()
  @IsInt()
  size?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;
}
