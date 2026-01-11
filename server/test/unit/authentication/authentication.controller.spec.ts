import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { AuthenticationController } from 'src/resources/authentication/authentication.controller';
import { AuthenticationService } from 'src/resources/authentication/authentication.service';
import { ConfigService } from '@nestjs/config';
import { UserRole } from 'src/common/enums/roles.enum';
import { UserType } from 'src/resources/authentication/dto/login.dto';
import {
  createLoginDto,
  createForgotPasswordDto,
  createVerifyResetOtpDto,
  createResetPasswordDto,
} from '../../utils/test-factories';

describe('AuthenticationController', () => {
  let controller: AuthenticationController;
  let service: jest.Mocked<AuthenticationService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    // Suppress logger output in tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    const mockService = {
      login: jest.fn(),
      refreshToken: jest.fn(),
      forgotPassword: jest.fn(),
      verifyResetOtp: jest.fn(),
      resetPassword: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        {
          provide: AuthenticationService,
          useValue: mockService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
    service = module.get(AuthenticationService);
    configService = module.get(ConfigService);
  });

  describe('login', () => {
    it('should call authenticationService.login with DTO', async () => {
      const loginDto = createLoginDto();
      const expectedResult = {
        access_token: {
          accessToken: 'token',
          refreshToken: 'refresh-token',
        },
        user: {
          id: 'user-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: UserRole.USER,
        },
        userType: UserType.USER,
      };

      service.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(service.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getToken', () => {
    it('should call authenticationService.refreshToken with user claims', async () => {
      const userClaims = {
        sub: 'user-id',
        email: 'test@example.com',
        role: UserRole.USER,
      };
      const expectedResult = {
        access_token: {
          accessToken: 'new-token',
          refreshToken: 'new-refresh-token',
        },
      };

      service.refreshToken.mockResolvedValue(expectedResult);

      const result = await controller.getToken(userClaims);

      expect(service.refreshToken).toHaveBeenCalledWith(userClaims);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user from request.user', async () => {
      const mockUser = {
        sub: 'user-id',
        email: 'test@example.com',
        role: UserRole.USER,
        organizationId: 'org-id',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: 'http://example.com/avatar.jpg',
        organization: {
          id: 'org-id',
          name: 'Test Org',
        },
      };

      const mockRequest = {
        user: mockUser,
      };

      const result = await controller.getCurrentUser(mockRequest as any);

      expect(result).toEqual({
        success: true,
        data: {
          user: {
            id: mockUser.sub,
            email: mockUser.email,
            role: mockUser.role,
            organizationId: mockUser.organizationId,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            avatarUrl: mockUser.avatarUrl,
            organization: mockUser.organization,
          },
        },
      });
    });

    it('should throw UnauthorizedException when user is missing', async () => {
      const mockRequest = {
        user: null,
      };

      await expect(
        controller.getCurrentUser(mockRequest as any),
      ).rejects.toThrow(UnauthorizedException);
      
      await expect(
        controller.getCurrentUser(mockRequest as any),
      ).rejects.toThrow('Not authenticated');
    });

    it('should throw UnauthorizedException when user is undefined', async () => {
      const mockRequest = {
        user: undefined,
      };

      await expect(
        controller.getCurrentUser(mockRequest as any),
      ).rejects.toThrow(UnauthorizedException);
      
      await expect(
        controller.getCurrentUser(mockRequest as any),
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('logout', () => {
    it('should clear cookies and return success message', async () => {
      const mockResponse = {
        clearCookie: jest.fn(),
      };

      const result = await controller.logout(mockResponse as any);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token');
      expect(result).toEqual({
        success: true,
        message: 'Logged out successfully',
      });
    });
  });

  describe('forgotPassword', () => {
    it('should call authenticationService.forgotPassword with DTO', async () => {
      const forgotPasswordDto = createForgotPasswordDto();
      const expectedResult = {
        success: true,
        message: 'A verification code has been sent to your email address',
      };

      service.forgotPassword.mockResolvedValue(expectedResult);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(service.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('verifyResetOtp', () => {
    it('should call authenticationService.verifyResetOtp with DTO', async () => {
      const verifyOtpDto = createVerifyResetOtpDto();
      const expectedResult = {
        success: true,
        message: 'Verification successful',
        token: 'reset-token',
      };

      service.verifyResetOtp.mockResolvedValue(expectedResult);

      const result = await controller.verifyResetOtp(verifyOtpDto);

      expect(service.verifyResetOtp).toHaveBeenCalledWith(verifyOtpDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('resetPassword', () => {
    it('should call authenticationService.resetPassword with DTO', async () => {
      const resetPasswordDto = createResetPasswordDto();
      const expectedResult = {
        success: true,
        message: 'Password has been reset successfully',
      };

      service.resetPassword.mockResolvedValue(expectedResult);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(service.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('googleAuthCallback', () => {
    it('should redirect to frontend on success', async () => {
      const mockRequest = {
        user: {
          access_token: 'token',
          refresh_token: 'refresh-token',
        },
      };
      const mockResponse = {
        redirect: jest.fn(),
      };

      await controller.googleAuthCallback(mockRequest as any, mockResponse as any);

      expect(configService.get).toHaveBeenCalledWith('FRONTEND_URL');
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/callback?token='),
      );
    });

    it('should redirect to error page when user data is invalid', async () => {
      const mockRequest = {
        user: null,
      };
      const mockResponse = {
        redirect: jest.fn(),
      };

      await controller.googleAuthCallback(mockRequest as any, mockResponse as any);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/error'),
      );
    });

    it('should redirect to error page when access_token is missing', async () => {
      const mockRequest = {
        user: {
          refresh_token: 'refresh-token',
          // Missing access_token
        },
      };
      const mockResponse = {
        redirect: jest.fn(),
      };

      await controller.googleAuthCallback(mockRequest as any, mockResponse as any);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/error'),
      );
    });

    it('should redirect to error page on exception', async () => {
      const mockRequest = {
        user: {
          access_token: 'token',
        },
      };
      const mockResponse = {
        redirect: jest.fn(),
      };

      // Mock configService.get to throw error on first call, but return URL on second call (in catch block)
      let callCount = 0;
      configService.get = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Config error');
        }
        // Second call (in catch block) should return a URL
        return 'http://localhost:3000';
      });

      await controller.googleAuthCallback(mockRequest as any, mockResponse as any);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/error'),
      );
    });
  });
});

