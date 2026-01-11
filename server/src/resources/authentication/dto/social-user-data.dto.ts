export interface SocialUserDataDto {
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  socialId: string;
  socialProvider: string;
  accessToken: string;
  refreshToken?: string;
  scopes?: string[];
  organizationId?: number;
}
