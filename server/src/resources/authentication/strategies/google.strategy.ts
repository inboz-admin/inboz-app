import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthenticationService } from '../authentication.service';
import axios from 'axios';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthenticationService,
  ) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get('GOOGLE_CALLBACK_URL'),
      scope: [
        'email',
        'profile',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
      ],
    });
  }

  authorizationParams(): Record<string, string> {
    return {
      access_type: 'offline',
      prompt: 'consent',
    };
  }

  private async fetchGrantedScopes(accessToken: string): Promise<string[]> {
    try {
      const response = await axios.get(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`,
      );
      
      if (response.data?.scope) {
        const scopes = response.data.scope.split(' ').filter(Boolean);
        return scopes;
      }
      
      this.logger.warn('No scopes found in tokeninfo response');
      return [];
    } catch (error) {
      this.logger.error(
        `Failed to fetch scopes from tokeninfo: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos } = profile;
    
    const profileScopes = profile._json?.scope?.split(' ').filter(Boolean) || [];
    
    let grantedScopes: string[] = [];
    try {
      grantedScopes = await this.fetchGrantedScopes(accessToken);
      
      if (grantedScopes.length === 0 && profileScopes.length > 0) {
        grantedScopes = profileScopes;
      }
    } catch (error) {
      grantedScopes = profileScopes;
    }
    
    if (grantedScopes.length === 0) {
      this.logger.error('No scopes were granted! This will cause API failures.');
    }
    
    const user = {
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      avatar: photos[0].value,
      socialId: profile.id,
      socialProvider: 'google',
      accessToken,
      refreshToken,
      scopes: grantedScopes,
    };

    const result = await this.authService.validateOrCreateSocialUser(user);
    done(null, result);
  }
}
