import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  constructor(private configService: ConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const errorParam = request.query.error;
    if (errorParam) {
      this.logger.warn('Google OAuth error received', { error: errorParam });

      const frontendUrl = this.configService.get('FRONTEND_URL');
      let errorMessage = 'Authentication failed';
      let errorCode = 'oauth_failed';

      switch (errorParam) {
        case 'access_denied':
          errorMessage =
            'You cancelled the Google sign-in. Please try again to continue.';
          errorCode = 'access_denied';
          break;
        case 'consent_required':
          errorMessage = 'Google consent is required to continue.';
          errorCode = 'consent_required';
          break;
        default:
          errorMessage = `Google authentication error: ${errorParam}`;
          errorCode = errorParam as string;
      }

      response.redirect(
        `${frontendUrl}/auth/error?error=${errorCode}&message=${encodeURIComponent(errorMessage)}`,
      );
      return false;
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
