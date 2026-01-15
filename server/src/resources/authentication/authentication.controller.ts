import {
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Res,
  UnauthorizedException,
  Body,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthenticationService } from './authentication.service';
import { EmployeeAuthenticationService, EmployeeLoginDto } from './services/employee-authentication.service';
import { PasswordResetService } from './services/password-reset.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetOtpDto } from './dto/verify-reset-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from 'src/configuration/jwt/public.decorator';
import { AuthGuard } from '@nestjs/passport';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GoogleGmailAuthGuard } from './guards/google-gmail-auth.guard';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from 'src/configuration/jwt/interfaces/jwt-payload.interface';

interface AuthenticatedRequest extends Request {
  user?: JwtPayload & {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    organization?: any;
  };
}

interface OAuthCallbackRequest extends Request {
  user?: {
    access_token: string;
    refresh_token: string;
  };
}

@Controller()
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly employeeAuthenticationService: EmployeeAuthenticationService,
    private readonly passwordResetService: PasswordResetService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: OAuthCallbackRequest, @Res() res: Response) {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const result = req.user;

    if (!result?.access_token) {
      return res.redirect(
        `${frontendUrl}/auth/error?error=invalid_user&message=${encodeURIComponent('Invalid user data received')}`,
      );
    }

    return res.redirect(
      `${frontendUrl}/auth/callback?token=${encodeURIComponent(result.access_token)}&refresh=${encodeURIComponent(result.refresh_token)}`,
    );
  }

  @Public()
  @Get('google/gmail')
  @UseGuards(AuthGuard('google-gmail'))
  async googleGmailAuth() {
    // This will redirect to Google OAuth for Gmail scopes
  }

  @Public()
  @Get('google/gmail/callback')
  @UseGuards(GoogleGmailAuthGuard)
  async googleGmailCallback(@Req() req: OAuthCallbackRequest, @Res() res: Response) {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const result = req.user;

    if (!result?.access_token) {
      return res.redirect(
        `${frontendUrl}/dashboard/campaigns?error=invalid_user&message=${encodeURIComponent('Invalid user data received')}`,
      );
    }

    // Redirect back to campaigns page with tokens for authentication
    return res.redirect(
      `${frontendUrl}/auth/callback?token=${encodeURIComponent(result.access_token)}&refresh=${encodeURIComponent(result.refresh_token)}&gmail_authorized=true`,
    );
  }

  @Get('scopes')
  async getScopes(@Req() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new UnauthorizedException('Not authenticated');
    }

    const scopes = await this.authenticationService.getUserScopes(req.user.sub);

    return {
      success: true,
      data: scopes,
    };
  }

  @Post('revoke')
  async revokeTokens(@Req() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new UnauthorizedException('Not authenticated');
    }

    await this.authenticationService.revokeUserTokens(req.user.sub);

    return {
      success: true,
      message: 'Tokens revoked successfully',
    };
  }

  @Get('me')
  async getCurrentUser(@Req() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new UnauthorizedException('Not authenticated');
    }
    const { sub, ...rest } = req.user;
    return {
      success: true,
      data: {
        user: {
          id: sub,
          ...rest,
        },
      },
    };
  }

  @Public()
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Post('employee/login')
  async employeeLogin(@Body() loginDto: EmployeeLoginDto) {
    const result = await this.employeeAuthenticationService.login(loginDto);
    return {
      success: true,
      data: result,
      message: 'Employee login successful',
    };
  }

  @Post('employee/select-organization')
  async selectOrganization(
    @Req() req: AuthenticatedRequest,
    @Body() body: { organizationId: string },
  ) {
    if (!req.user) {
      throw new UnauthorizedException('Not authenticated');
    }

    if (req.user.type !== 'employee') {
      throw new UnauthorizedException('Only employees can select organizations');
    }

    const result = await this.employeeAuthenticationService.selectOrganization(
      req.user.sub,
      body.organizationId,
    );

    return {
      success: true,
      data: result,
      message: 'Organization selected successfully',
    };
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.passwordResetService.forgotPassword(dto);
    return {
      success: result.success,
      message: result.message,
      statusCode: 201,
    };
  }

  @Public()
  @Post('verify-reset-otp')
  async verifyResetOtp(@Body() dto: VerifyResetOtpDto) {
    const result = await this.passwordResetService.verifyResetOtp(dto);
    return {
      success: result.success,
      message: result.message,
      data: {
        token: result.token,
      },
      statusCode: 200,
    };
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.passwordResetService.resetPassword(dto);
    return {
      success: result.success,
      message: result.message,
      statusCode: 200,
    };
  }
}
