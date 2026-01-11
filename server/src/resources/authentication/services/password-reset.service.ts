import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PasswordResetTokenRepository } from '../password-reset-token.repository';
import { PasswordResetToken, UserType } from '../entities/password-reset-token.entity';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { VerifyResetOtpDto } from '../dto/verify-reset-otp.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { EmployeesService } from 'src/resources/employees/employees.service';
import { EmailQueue } from 'src/configuration/bull/queues/email.queue';
import { CryptoUtilityService } from 'src/common/services/crypto-utility.service';
import { TransactionManager } from 'src/common/services/transaction-manager.service';
import { EmployeeStatus } from 'src/resources/employees/entities/employee.entity';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly OTP_EXPIRY_MINUTES = 15;
  private readonly MAX_ATTEMPTS = 5;

  constructor(
    private readonly tokenRepository: PasswordResetTokenRepository,
    private readonly employeesService: EmployeesService,
    private readonly emailQueue: EmailQueue,
    private readonly cryptoUtilityService: CryptoUtilityService,
    private readonly transactionManager: TransactionManager,
  ) {}

  /**
   * Request password reset - generates OTP and sends email
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; success: boolean }> {
    return this.transactionManager.execute(async (transaction) => {
      // Find employee by email
      const employee = await this.employeesService.findByEmail(dto.email);

      // Don't reveal if email exists (security best practice)
      if (!employee) {
        this.logger.warn(`Password reset requested for non-existent email: ${dto.email}`);
        // Return success message even if user doesn't exist (security)
        return {
          message: 'A verification code has been sent to your email address',
          success: true,
        };
      }

      // Check if employee is active
      if (employee.status !== EmployeeStatus.ACTIVE) {
        this.logger.warn(`Password reset requested for inactive employee: ${dto.email}`);
        // Return generic message for security
        return {
          message: 'A verification code has been sent to your email address',
          success: true,
        };
      }

      // Generate OTP
      const otp = this.cryptoUtilityService.generateOtp();
      const token = this.cryptoUtilityService.generateRandomString(32);

      // Calculate expiration time (15 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

      // Invalidate existing tokens (always EMPLOYEE for this service)
      await this.tokenRepository.invalidateTokens(dto.email, UserType.EMPLOYEE, transaction);

      // Create new token (always EMPLOYEE for this service)
      await this.tokenRepository.createToken(
        dto.email,
        UserType.EMPLOYEE,
        token,
        otp,
        expiresAt,
        transaction,
      );

      // Queue OTP email
      try {
        const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email;
        await this.emailQueue.sendPasswordResetOtpEmail(
          employee.email,
          fullName,
          otp,
        );
        this.logger.log(`Password reset OTP email queued for: ${employee.email}`);
      } catch (error) {
        // Log error but don't fail the request
        this.logger.error(`Failed to queue OTP email for ${employee.email}:`, error);
      }

      return {
        message: 'A verification code has been sent to your email address',
        success: true,
      };
    });
  }

  /**
   * Verify OTP and return token for password reset
   */
  async verifyResetOtp(dto: VerifyResetOtpDto): Promise<{ message: string; success: boolean; token: string }> {
    const token = await this.tokenRepository.findValidToken(
      dto.email,
      UserType.EMPLOYEE,
      dto.otp,
    );

    if (!token) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    // Check if token is expired
    if (token.isExpired()) {
      throw new UnauthorizedException('Verification code has expired');
    }

    // Check if token is valid
    if (!token.isValid(this.MAX_ATTEMPTS)) {
      throw new UnauthorizedException('Verification code has exceeded maximum attempts');
    }

    // Increment attempt count
    await this.tokenRepository.incrementAttempts(token.id);

    // Verify OTP matches
    if (token.otp !== dto.otp) {
      throw new UnauthorizedException('Invalid verification code');
    }

    return {
      message: 'Verification successful. You can now reset your password.',
      success: true,
      token: token.token,
    };
  }

  /**
   * Reset password after OTP verification
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string; success: boolean }> {
    return this.transactionManager.execute(async (transaction) => {
      // Find valid token (always EMPLOYEE for this service)
      const token = await this.tokenRepository.findValidToken(
        dto.email,
        UserType.EMPLOYEE,
        dto.otp,
        transaction,
      );

      if (!token) {
        throw new UnauthorizedException('Invalid or expired verification code');
      }

      // Verify OTP matches
      if (token.otp !== dto.otp) {
        await this.tokenRepository.incrementAttempts(token.id, transaction);
        throw new UnauthorizedException('Invalid verification code');
      }

      // Check if token is expired
      if (token.isExpired()) {
        throw new UnauthorizedException('Verification code has expired');
      }

      // Check if token is already used
      if (token.used) {
        throw new BadRequestException('This verification code has already been used');
      }

      // Find employee
      const employee = await this.employeesService.findByEmail(dto.email);
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      // Check if employee is active
      if (employee.status !== EmployeeStatus.ACTIVE) {
        throw new BadRequestException('Employee account is not active');
      }

      // Update employee password (bypasses SUPERADMIN check - allows self-service password reset)
      await this.employeesService.updatePassword(employee.id, dto.newPassword, transaction);

      // Mark token as used
      await this.tokenRepository.markAsUsed(token.id, transaction);

      this.logger.log(`Password reset successful for employee: ${dto.email}`);

      return {
        message: 'Password has been reset successfully',
        success: true,
      };
    });
  }
}

