import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum SocialProvider {
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
}

export class SocialAuthDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @IsEnum(SocialProvider)
  provider: SocialProvider;
}
