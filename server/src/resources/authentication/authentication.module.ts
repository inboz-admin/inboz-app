import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { AuthenticationRepository } from './authentication.repository';
import { PasswordResetService } from './services/password-reset.service';
import { PasswordResetTokenRepository } from './password-reset-token.repository';
import { OAuthStateService } from './services/oauth-state.service';
import { RiscService } from './services/risc.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { User } from '../users/entities/user.entity';
import { GmailOAuthToken } from '../users/entities/gmail-oauth-token.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EmployeesModule } from '../employees/employees.module';
import { EmployeeAuthenticationService } from './services/employee-authentication.service';
import { BullModule } from 'src/configuration/bull/bull.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    SequelizeModule.forFeature([User, GmailOAuthToken, Organization, PasswordResetToken]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    NestJwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'default-secret',
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_TOKEN_EXPIRATION') || '15m',
        },
      }),
      inject: [ConfigService],
    }),
    SubscriptionsModule,
    EmployeesModule,
    BullModule, // For EmailQueue
    AuditLogsModule, // For audit logging during signup
  ],
  controllers: [AuthenticationController],
  providers: [
    AuthenticationService,
    AuthenticationRepository,
    EmployeeAuthenticationService,
    PasswordResetService,
    PasswordResetTokenRepository,
    OAuthStateService,
    RiscService,
    GoogleAuthGuard,
    {
      provide: GoogleStrategy,
      useFactory: (
        configService: ConfigService,
        authService: AuthenticationService,
        stateService: OAuthStateService,
      ) => {
        return new GoogleStrategy(configService, authService, stateService);
      },
      inject: [ConfigService, AuthenticationService, OAuthStateService],
    },
  ],
  exports: [AuthenticationService, EmployeeAuthenticationService, PasswordResetService],
})
export class AuthenticationModule {}
