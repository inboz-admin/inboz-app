import { Transaction } from 'sequelize';
import { TransactionManager } from 'src/common/services/transaction-manager.service';
import { UserContextService } from 'src/common/services/user-context.service';
import { SubscriptionsService } from 'src/resources/subscriptions/subscriptions.service';
import { SubscriptionPlansService } from 'src/resources/subscriptions/subscription-plans.service';
import { OrganizationRepository } from 'src/resources/organizations/organizations.repository';
import { AuthenticationRepository } from 'src/resources/authentication/authentication.repository';
import { JwtService } from 'src/configuration/jwt/jwt.service';
import { CryptoUtilityService } from 'src/common/services/crypto-utility.service';
import { PasswordResetService } from 'src/resources/authentication/password-reset.service';
import { OAuthService } from 'src/resources/authentication/oauth.service';
import { EmailService } from 'src/configuration/email/email.service';
import { PasswordResetTokenRepository } from 'src/resources/authentication/password-reset-token.repository';

/**
 * Test Mocks
 * 
 * Provides reusable mocks for common services used in tests
 */

export const createMockTransactionManager = (): jest.Mocked<TransactionManager> => {
  const mockTransaction = {
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
  } as unknown as Transaction;

  return {
    execute: jest.fn().mockImplementation(async (operation) => {
      return operation(mockTransaction);
    }),
    executeSequential: jest.fn().mockImplementation(async (operations) => {
      return Promise.all(operations.map(op => op(mockTransaction)));
    }),
    executeSerializable: jest.fn().mockImplementation(async (operation) => {
      return operation(mockTransaction);
    }),
    executeReadOnly: jest.fn().mockImplementation(async (operation) => {
      return operation(mockTransaction);
    }),
  } as unknown as jest.Mocked<TransactionManager>;
};

export const createMockUserContextService = (): jest.Mocked<UserContextService> => {
  return {
    run: jest.fn().mockImplementation((user, fn) => fn()),
    getCurrentUser: jest.fn().mockReturnValue({
      sub: 'test-user-id',
      email: 'test@example.com',
      role: 'ADMIN',
    }),
    getCurrentUserId: jest.fn().mockReturnValue('test-user-id'),
    getCurrentUserEmail: jest.fn().mockReturnValue('test@example.com'),
    getCurrentUserRole: jest.fn().mockReturnValue('ADMIN'),
    isAuthenticated: jest.fn().mockReturnValue(true),
  } as unknown as jest.Mocked<UserContextService>;
};

export const createMockSubscriptionsService = (): jest.Mocked<Partial<SubscriptionsService>> => {
  return {
    createSubscription: jest.fn(),
    findActiveSubscriptionByOrganizationId: jest.fn(),
    cancelSubscription: jest.fn(),
  } as jest.Mocked<Partial<SubscriptionsService>>;
};

export const createMockSubscriptionPlansService = (): jest.Mocked<Partial<SubscriptionPlansService>> => {
  return {
    findAll: jest.fn(),
    findSubscriptionPlanById: jest.fn(),
  } as jest.Mocked<Partial<SubscriptionPlansService>>;
};

export const createMockOrganizationRepository = (): jest.Mocked<Partial<OrganizationRepository>> => {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdOrFail: jest.fn(),
    findBySlugOrFail: jest.fn(),
    findByDomainOrFail: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    forceDelete: jest.fn(),
    restore: jest.fn(),
    slugExists: jest.fn(),
    domainExists: jest.fn(),
    billingEmailExists: jest.fn(),
  } as jest.Mocked<Partial<OrganizationRepository>>;
};

export const createMockAuthenticationRepository = (): jest.Mocked<Partial<AuthenticationRepository>> => {
  return {
    findByEmail: jest.fn(),
    findBySocialId: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  } as jest.Mocked<Partial<AuthenticationRepository>>;
};

export const createMockJwtService = (): jest.Mocked<Partial<JwtService>> => {
  return {
    generateTokens: jest.fn().mockResolvedValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    }),
    verifyToken: jest.fn(),
    decodeToken: jest.fn(),
  } as jest.Mocked<Partial<JwtService>>;
};

export const createMockCryptoUtilityService = (): jest.Mocked<Partial<CryptoUtilityService>> => {
  return {
    verifyPassword: jest.fn().mockResolvedValue(true),
    encryptPassword: jest.fn().mockResolvedValue('hashed-password'),
    generateDefaultPassword: jest.fn().mockReturnValue('DefaultPassword123!'),
    generateRandomString: jest.fn().mockReturnValue('random-string'),
  } as jest.Mocked<Partial<CryptoUtilityService>>;
};

export const createMockPasswordResetService = (): jest.Mocked<Partial<PasswordResetService>> => {
  return {
    forgotPassword: jest.fn().mockResolvedValue({
      success: true,
      message: 'A verification code has been sent to your email address',
    }),
    verifyResetOtp: jest.fn().mockResolvedValue({
      success: true,
      message: 'Verification successful',
      token: 'reset-token',
    }),
    resetPassword: jest.fn().mockResolvedValue({
      success: true,
      message: 'Password has been reset successfully',
    }),
  } as jest.Mocked<Partial<PasswordResetService>>;
};

export const createMockOAuthService = (): jest.Mocked<Partial<OAuthService>> => {
  return {
    validateEmailDomain: jest.fn(),
    handleGoogleCallback: jest.fn(),
    googleLogin: jest.fn(),
    validateOrCreateSocialUser: jest.fn(),
  } as jest.Mocked<Partial<OAuthService>>;
};

export const createMockEmailService = (): jest.Mocked<Partial<EmailService>> => {
  return {
    sendPasswordResetOtp: jest.fn().mockResolvedValue(undefined),
    sendEmail: jest.fn().mockResolvedValue(undefined),
  } as jest.Mocked<Partial<EmailService>>;
};

export const createMockPasswordResetTokenRepository = (): jest.Mocked<Partial<PasswordResetTokenRepository>> => {
  return {
    findValidToken: jest.fn(),
    findUsedToken: jest.fn(),
    findByOtp: jest.fn(),
    invalidateTokens: jest.fn().mockResolvedValue(1),
    createToken: jest.fn(),
    findOne: jest.fn(),
  } as jest.Mocked<Partial<PasswordResetTokenRepository>>;
};

