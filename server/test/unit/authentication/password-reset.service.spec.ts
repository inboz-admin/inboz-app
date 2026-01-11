import {
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PasswordResetService } from 'src/resources/authentication/password-reset.service';
import { PasswordResetTokenRepository } from 'src/resources/authentication/password-reset-token.repository';
import { AuthenticationRepository } from 'src/resources/authentication/authentication.repository';
import { CryptoUtilityService } from 'src/common/services/crypto-utility.service';
import { EmailService } from 'src/configuration/email/email.service';
import { TransactionManager } from 'src/common/services/transaction-manager.service';
import { PasswordResetToken } from 'src/resources/authentication/entities/password-reset-token.entity';
import { User, UserStatus } from 'src/resources/users/entities/user.entity';
import { UserType } from 'src/resources/authentication/dto/login.dto';
import {
  createMockPasswordResetTokenRepository,
  createMockAuthenticationRepository,
  createMockCryptoUtilityService,
  createMockEmailService,
  createMockTransactionManager,
} from '../../utils/test-mocks';
import {
  createForgotPasswordDto,
  createVerifyResetOtpDto,
  createResetPasswordDto,
  createUserEntity,
} from '../../utils/test-factories';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let mockTokenRepository: jest.Mocked<Partial<PasswordResetTokenRepository>>;
  let mockAuthRepository: jest.Mocked<Partial<AuthenticationRepository>>;
  let mockCryptoService: jest.Mocked<Partial<CryptoUtilityService>>;
  let mockEmailService: jest.Mocked<Partial<EmailService>>;
  let mockTransactionManager: jest.Mocked<TransactionManager>;

  beforeEach(() => {
    mockTokenRepository = createMockPasswordResetTokenRepository();
    mockAuthRepository = createMockAuthenticationRepository();
    mockCryptoService = createMockCryptoUtilityService();
    mockEmailService = createMockEmailService();
    mockTransactionManager = createMockTransactionManager();

    service = new PasswordResetService(
      mockTokenRepository as unknown as PasswordResetTokenRepository,
      mockAuthRepository as unknown as AuthenticationRepository,
      mockCryptoService as unknown as CryptoUtilityService,
      mockEmailService as unknown as EmailService,
      mockTransactionManager,
    );
  });

  describe('forgotPassword', () => {
    it('should find user, generate OTP, invalidate existing tokens, and send email', async () => {
      const forgotPasswordDto = createForgotPasswordDto({
        email: 'test@example.com',
        userType: UserType.USER,
      });

      const mockUser = createUserEntity({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      }) as User;

      const mockToken = {
        id: 'token-id',
        email: 'test@example.com',
        userType: UserType.USER,
        token: 'reset-token',
        otp: '123456',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        attempts: 0,
      } as PasswordResetToken;

      mockAuthRepository.findByEmail = jest.fn().mockResolvedValue(mockUser);
      mockCryptoService.generateRandomString = jest.fn().mockReturnValue('random-token');
      mockTokenRepository.invalidateTokens = jest.fn().mockResolvedValue(1);
      mockTokenRepository.createToken = jest.fn().mockResolvedValue(mockToken);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(mockAuthRepository.findByEmail).toHaveBeenCalledWith(forgotPasswordDto.email);
      expect(mockTokenRepository.invalidateTokens).toHaveBeenCalledWith(
        forgotPasswordDto.email,
        forgotPasswordDto.userType,
        expect.anything(),
      );
      expect(mockTokenRepository.createToken).toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetOtp).toHaveBeenCalledWith(
        mockUser.email,
        `${mockUser.firstName} ${mockUser.lastName}`,
        expect.any(String), // OTP is generated
      );
      expect(result).toEqual({
        message: 'A verification code has been sent to your email address',
        success: true,
      });
      expect(mockTransactionManager.executeSerializable).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      const forgotPasswordDto = createForgotPasswordDto({
        email: 'nonexistent@example.com',
        userType: UserType.USER,
      });

      mockAuthRepository.findByEmail = jest.fn().mockResolvedValue(null);

      await expect(service.forgotPassword(forgotPasswordDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.forgotPassword(forgotPasswordDto)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('verifyResetOtp', () => {
    it('should verify valid OTP and return token', async () => {
      const verifyOtpDto = createVerifyResetOtpDto({
        email: 'test@example.com',
        userType: UserType.USER,
        otp: '123456',
      });

      const mockToken = {
        id: 'token-id',
        email: 'test@example.com',
        userType: UserType.USER,
        token: 'reset-token',
        otp: '123456',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        attempts: 0,
        isExpired: jest.fn().mockReturnValue(false),
        isValid: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue(undefined),
      } as unknown as PasswordResetToken;

      mockTokenRepository.findValidToken = jest.fn().mockResolvedValue(mockToken);

      const result = await service.verifyResetOtp(verifyOtpDto);

      expect(mockTokenRepository.findValidToken).toHaveBeenCalledWith(
        verifyOtpDto.email,
        verifyOtpDto.userType,
        verifyOtpDto.otp,
      );
      expect(mockToken.attempts).toBe(1);
      expect(mockToken.save).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Verification successful. You can now reset your password.',
        success: true,
        token: mockToken.token,
      });
    });

    it('should throw UnauthorizedException for invalid OTP', async () => {
      const verifyOtpDto = createVerifyResetOtpDto({
        email: 'test@example.com',
        userType: UserType.USER,
        otp: '999999',
      });

      mockTokenRepository.findValidToken = jest.fn().mockResolvedValue(null);

      await expect(service.verifyResetOtp(verifyOtpDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyResetOtp(verifyOtpDto)).rejects.toThrow(
        'Invalid verification code',
      );
    });

    it('should throw UnauthorizedException for expired OTP', async () => {
      const verifyOtpDto = createVerifyResetOtpDto({
        email: 'test@example.com',
        userType: UserType.USER,
        otp: '123456',
      });

      const mockToken = {
        id: 'token-id',
        email: 'test@example.com',
        userType: UserType.USER,
        otp: '123456',
        expiresAt: new Date(Date.now() - 1000), // Expired
        used: false,
        attempts: 0,
        isExpired: jest.fn().mockReturnValue(true),
        isValid: jest.fn().mockReturnValue(false),
      } as unknown as PasswordResetToken;

      mockTokenRepository.findValidToken = jest.fn().mockResolvedValue(mockToken);

      await expect(service.verifyResetOtp(verifyOtpDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyResetOtp(verifyOtpDto)).rejects.toThrow('expired');
    });

    it('should throw UnauthorizedException after max attempts exceeded', async () => {
      const verifyOtpDto = createVerifyResetOtpDto({
        email: 'test@example.com',
        userType: UserType.USER,
        otp: '123456',
      });

      const mockToken = {
        id: 'token-id',
        email: 'test@example.com',
        userType: UserType.USER,
        otp: '123456',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        attempts: 5, // Max attempts exceeded
        isExpired: jest.fn().mockReturnValue(false),
        isValid: jest.fn().mockReturnValue(true),
      } as unknown as PasswordResetToken;

      mockTokenRepository.findValidToken = jest.fn().mockResolvedValue(mockToken);

      await expect(service.verifyResetOtp(verifyOtpDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyResetOtp(verifyOtpDto)).rejects.toThrow(
        'Maximum verification attempts exceeded',
      );
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid OTP', async () => {
      const resetPasswordDto = createResetPasswordDto({
        email: 'test@example.com',
        userType: UserType.USER,
        newPassword: 'NewPassword123!',
        otp: '123456',
      });

      const mockUser = createUserEntity({
        email: 'test@example.com',
        passwordHash: 'old-hashed-password',
      }) as User;

      const mockToken = {
        id: 'token-id',
        email: 'test@example.com',
        userType: UserType.USER,
        token: 'reset-token',
        otp: '123456',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        attempts: 0,
        isExpired: jest.fn().mockReturnValue(false),
        isValid: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue(undefined),
      } as unknown as PasswordResetToken;

      mockTokenRepository.findValidToken = jest.fn().mockResolvedValue(mockToken);
      mockAuthRepository.findByEmail = jest.fn().mockResolvedValue(mockUser);
      mockCryptoService.encryptPassword = jest.fn().mockResolvedValue('new-hashed-password');
      mockUser.save = jest.fn().mockResolvedValue(mockUser);

      const result = await service.resetPassword(resetPasswordDto);

      expect(mockTokenRepository.findValidToken).toHaveBeenCalledWith(
        resetPasswordDto.email,
        resetPasswordDto.userType,
        resetPasswordDto.otp,
      );
      expect(mockAuthRepository.findByEmail).toHaveBeenCalledWith(resetPasswordDto.email);
      expect(mockCryptoService.encryptPassword).toHaveBeenCalledWith(
        resetPasswordDto.newPassword,
      );
      expect(mockUser.passwordHash).toBe('new-hashed-password');
      expect(mockToken.used).toBe(true);
      expect(mockToken.save).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Password has been reset successfully',
        success: true,
      });
      expect(mockTransactionManager.executeSerializable).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid OTP', async () => {
      const resetPasswordDto = createResetPasswordDto({
        email: 'test@example.com',
        userType: UserType.USER,
        newPassword: 'NewPassword123!',
        otp: '999999',
      });

      mockTokenRepository.findValidToken = jest.fn().mockResolvedValue(null);
      mockTokenRepository.findUsedToken = jest.fn().mockResolvedValue(null);
      mockTokenRepository.findByOtp = jest.fn().mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Invalid verification code',
      );
    });

    it('should throw UnauthorizedException for already used OTP', async () => {
      const resetPasswordDto = createResetPasswordDto({
        email: 'test@example.com',
        userType: UserType.USER,
        newPassword: 'NewPassword123!',
        otp: '123456',
      });

      const usedToken = {
        id: 'token-id',
        email: 'test@example.com',
        userType: UserType.USER,
        otp: '123456',
        used: true,
      } as PasswordResetToken;

      mockTokenRepository.findValidToken = jest.fn().mockResolvedValue(null);
      mockTokenRepository.findUsedToken = jest.fn().mockResolvedValue(usedToken);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow('already been used');
    });

    it('should throw UnauthorizedException for wrong account OTP', async () => {
      const resetPasswordDto = createResetPasswordDto({
        email: 'test@example.com',
        userType: UserType.USER,
        newPassword: 'NewPassword123!',
        otp: '123456',
      });

      const wrongToken = {
        id: 'token-id',
        email: 'other@example.com', // Different email
        userType: UserType.USER,
        otp: '123456',
        used: false,
      } as PasswordResetToken;

      mockTokenRepository.findValidToken = jest.fn().mockResolvedValue(null);
      mockTokenRepository.findUsedToken = jest.fn().mockResolvedValue(null);
      mockTokenRepository.findByOtp = jest.fn().mockResolvedValue(wrongToken);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow('Invalid verification code for this account');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      const resetPasswordDto = createResetPasswordDto({
        email: 'nonexistent@example.com',
        userType: UserType.USER,
        newPassword: 'NewPassword123!',
        otp: '123456',
      });

      const mockToken = {
        id: 'token-id',
        email: 'nonexistent@example.com',
        userType: UserType.USER,
        otp: '123456',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        attempts: 0,
        isExpired: jest.fn().mockReturnValue(false),
        isValid: jest.fn().mockReturnValue(true),
      } as unknown as PasswordResetToken;

      mockTokenRepository.findValidToken = jest.fn().mockResolvedValue(mockToken);
      mockAuthRepository.findByEmail = jest.fn().mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow('not found');
    });
  });
});

