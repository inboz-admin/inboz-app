import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { OAuthStateService } from '../services/oauth-state.service';

@Injectable()
export class GoogleGmailAuthGuard extends AuthGuard('google-gmail') {
  private readonly logger = new Logger(GoogleGmailAuthGuard.name);

  constructor(
    private configService: ConfigService,
    private stateService: OAuthStateService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const errorParam = request.query.error;
    if (errorParam) {
      this.logger.warn('Google OAuth error received', { error: errorParam });

      const frontendUrl = this.configService.get('FRONTEND_URL');
      let errorMessage = 'Gmail authorization failed';
      let errorCode = 'oauth_failed';

      switch (errorParam) {
        case 'access_denied':
          errorMessage =
            'You cancelled the Gmail authorization. Campaign features require Gmail access.';
          errorCode = 'access_denied';
          break;
        case 'consent_required':
          errorMessage = 'Gmail consent is required to use campaign features.';
          errorCode = 'consent_required';
          break;
        default:
          errorMessage = `Gmail authorization error: ${errorParam}`;
          errorCode = errorParam as string;
      }

      response.redirect(
        `${frontendUrl}/dashboard/campaigns?error=${errorCode}&message=${encodeURIComponent(errorMessage)}`,
      );
      return false;
    }

    // Validate state parameter for CSRF protection
    const state = request.query.state;
    if (state) {
      const stateMetadata = await this.stateService.validateAndConsumeState(state);
      if (!stateMetadata) {
        this.logger.warn('Invalid or missing OAuth state parameter', { state });
        const frontendUrl = this.configService.get('FRONTEND_URL');
        response.redirect(
          `${frontendUrl}/dashboard/campaigns?error=invalid_state&message=${encodeURIComponent('Invalid or expired authorization request. Please try again.')}`,
        );
        return false;
      }
    } else {
      // State is recommended but not strictly required if Redis is unavailable
      this.logger.warn('OAuth callback received without state parameter');
    }

    return (await super.canActivate(context)) as boolean;
  }

  handleRequest(err, user, info) {
    if (err) {
      this.logger.error('Passport authentication error', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }

    if (!user) {
      this.logger.error('No user data from Passport strategy');
      throw new UnauthorizedException('No user data received from Google');
    }

    return user;
  }
}
