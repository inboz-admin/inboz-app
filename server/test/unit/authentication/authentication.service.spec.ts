import { UnauthorizedException } from '@nestjs/common';
import { AuthenticationService } from 'src/resources/authentication/authentication.service';
import { AuthenticationRepository } from 'src/resources/authentication/authentication.repository';
import { JwtService } from 'src/configuration/jwt/jwt.service';
import { CryptoUtilityService } from 'src/common/services/crypto-utility.service';
import { PasswordResetService } from 'src/resources/authentication/password-reset.service';
import { OAuthService } from 'src/resources/authentication/oauth.service';
import { User, UserStatus } from 'src/resources/users/entities/user.entity';
import { UserRole } from 'src/common/enums/roles.enum';
import { UserType } from 'src/resources/authentication/dto/login.dto';
import {
  createMockAuthenticationRepository,
  createMockJwtService,
  createMockCryptoUtilityService,
  createMockPasswordResetService,
  createMockOAuthService,
} from '../../utils/test-mocks';
import {
  createLoginDto,
  createUserEntity,
  createForgotPasswordDto,
  createVerifyResetOtpDto,
  createResetPasswordDto,
} from '../../utils/test-factories';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let mockRepository: jest.Mocked<Partial<AuthenticationRepository>>;
  let mockJwtService: jest.Mocked<Partial<JwtService>>;
  let mockCryptoService: jest.Mocked<Partial<CryptoUtilityService>>;
  let mockPasswordResetService: jest.Mocked<Partial<PasswordResetService>>;
  let mockOAuthService: jest.Mocked<Partial<OAuthService>>;

  beforeEach(() => {
    mockRepository = createMockAuthenticationRepository();
    mockJwtService = createMockJwtService();
    mockCryptoService = createMockCryptoUtilityService();
    mockPasswordResetService = createMockPasswordResetService();
    mockOAuthService = createMockOAuthService();

    service = new AuthenticationService(
      mockRepository as unknown as AuthenticationRepository,
      mockJwtService as unknown as JwtService,
      mockCryptoService as unknown as CryptoUtilityService,
      mockPasswordResetService as unknown as PasswordResetService,
      mockOAuthService as unknown as OAuthService,
    );
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const loginDto = createLoginDto({
        email: 'test@example.com',
        password: 'TestPassword123!',
        userType: UserType.USER,
      });

      const mockUser = createUserEntity({
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      }) as User;

      mockRepository.findByEmail = jest.fn().mockResolvedValue(mockUser);
      mockCryptoService.verifyPassword = jest.fn().mockResolvedValue(true);
      mockJwtService.generateTokens = jest.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await service.login(loginDto);

      expect(mockRepository.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(mockCryptoService.verifyPassword).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.passwordHash,
      );
      expect(mockJwtService.generateTokens).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        type: 'user',
      });
      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toHaveProperty('accessToken', 'access-token');
      expect(result.access_token).toHaveProperty('refreshToken', 'refresh-token');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('userType', UserType.USER);
      expect(result.user).toHaveProperty('id', mockUser.id);
      expect(result.user).toHaveProperty('email', mockUser.email);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      const loginDto = createLoginDto({
        email: 'nonexistent@example.com',
        password: 'TestPassword123!',
        userType: UserType.USER,
      });

      mockRepository.findByEmail = jest.fn().mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid user credentials');
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const loginDto = createLoginDto({
        email: 'test@example.com',
        password: 'WrongPassword123!',
        userType: UserType.USER,
      });

      const mockUser = createUserEntity({
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        status: UserStatus.ACTIVE,
      }) as User;

      mockRepository.findByEmail = jest.fn().mockResolvedValue(mockUser);
      mockCryptoService.verifyPassword = jest.fn().mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid user credentials');
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const loginDto = createLoginDto({
        email: 'test@example.com',
        password: 'TestPassword123!',
        userType: UserType.USER,
      });

      const mockUser = createUserEntity({
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        status: UserStatus.INACTIVE,
      }) as User;

      mockRepository.findByEmail = jest.fn().mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('inactive');
    });

    it('should throw UnauthorizedException for social user without password', async () => {
      const loginDto = createLoginDto({
        email: 'test@example.com',
        password: 'TestPassword123!',
        userType: UserType.USER,
      });

      const mockUser = createUserEntity({
        email: 'test@example.com',
        passwordHash: null, // Social user without password
        status: UserStatus.ACTIVE,
      }) as User;

      mockRepository.findByEmail = jest.fn().mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid user credentials');
    });

    it('should throw UnauthorizedException for invalid userType', async () => {
      const loginDto = createLoginDto({
        email: 'test@example.com',
        password: 'TestPassword123!',
        userType: 'EMPLOYEE' as UserType, // Invalid userType
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid user type');
    });
  });

  describe('refreshToken', () => {
    it('should generate new access token with valid user claims', async () => {
      const userClaims = {
        sub: 'user-id',
        email: 'test@example.com',
        role: UserRole.USER,
      };

      mockJwtService.generateTokens = jest.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await service.refreshToken(userClaims);

      expect(mockJwtService.generateTokens).toHaveBeenCalledWith(userClaims);
      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toHaveProperty('accessToken', 'new-access-token');
      expect(result.access_token).toHaveProperty('refreshToken', 'new-refresh-token');
    });
  });

  describe('validateEmailDomain', () => {
    it('should delegate to OAuthService.validateEmailDomain', () => {
      const email = 'test@example.com';

      service.validateEmailDomain(email);

      expect(mockOAuthService.validateEmailDomain).toHaveBeenCalledWith(email);
    });
  });

  describe('handleGoogleCallback', () => {
    it('should delegate to OAuthService.handleGoogleCallback', async () => {
      const code = 'auth-code';
      const expectedResult = { access_token: 'token', user: {} };

      mockOAuthService.handleGoogleCallback = jest.fn().mockResolvedValue(expectedResult);

      const result = await service.handleGoogleCallback(code);

      expect(mockOAuthService.handleGoogleCallback).toHaveBeenCalledWith(code);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('googleLogin', () => {
    it('should delegate to OAuthService.googleLogin', async () => {
      const token = 'google-id-token';
      const expectedResult = { access_token: 'token', user: {} };

      mockOAuthService.googleLogin = jest.fn().mockResolvedValue(expectedResult);

      const result = await service.googleLogin(token);

      expect(mockOAuthService.googleLogin).toHaveBeenCalledWith(token);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('validateOrCreateSocialUser', () => {
    it('should delegate to OAuthService.validateOrCreateSocialUser', async () => {
      const socialData = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        socialId: 'google-123',
        socialProvider: 'google',
        accessToken: 'google-access-token',
      };

      const expectedResult = {
        access_token: 'token',
        refresh_token: 'refresh-token',
        user: {
          id: 1,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: UserRole.USER,
        },
      };

      mockOAuthService.validateOrCreateSocialUser = jest.fn().mockResolvedValue(expectedResult);

      const result = await service.validateOrCreateSocialUser(socialData);

      expect(mockOAuthService.validateOrCreateSocialUser).toHaveBeenCalledWith(socialData);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('forgotPassword', () => {
    it('should delegate to PasswordResetService.forgotPassword', async () => {
      const forgotPasswordDto = createForgotPasswordDto();

      const expectedResult = {
        success: true,
        message: 'A verification code has been sent to your email address',
      };

      mockPasswordResetService.forgotPassword = jest.fn().mockResolvedValue(expectedResult);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(mockPasswordResetService.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('verifyResetOtp', () => {
    it('should delegate to PasswordResetService.verifyResetOtp', async () => {
      const verifyOtpDto = createVerifyResetOtpDto();

      const expectedResult = {
        success: true,
        message: 'Verification successful',
        token: 'reset-token',
      };

      mockPasswordResetService.verifyResetOtp = jest.fn().mockResolvedValue(expectedResult);

      const result = await service.verifyResetOtp(verifyOtpDto);

      expect(mockPasswordResetService.verifyResetOtp).toHaveBeenCalledWith(verifyOtpDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('resetPassword', () => {
    it('should delegate to PasswordResetService.resetPassword', async () => {
      const resetPasswordDto = createResetPasswordDto();

      const expectedResult = {
        success: true,
        message: 'Password has been reset successfully',
      };

      mockPasswordResetService.resetPassword = jest.fn().mockResolvedValue(expectedResult);

      const result = await service.resetPassword(resetPasswordDto);

      expect(mockPasswordResetService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
      expect(result).toEqual(expectedResult);
    });
  });
});

