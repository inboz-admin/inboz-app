import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { Tokens } from './interfaces/tokens.interface';
import { UserRole } from 'src/common/enums/roles.enum';

@Injectable()
export class JwtService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateTokens(payload: {
    sub: string;
    email: string;
    role: UserRole;
  }): Promise<Tokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn:
          this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn:
          this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION') || '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async refreshTokens(refreshToken: string): Promise<Tokens> {
    try {
      const payload = await this.verifyToken(refreshToken);
      return this.generateTokens({
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
