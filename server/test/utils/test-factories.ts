import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { CreateOrganizationDto } from 'src/resources/organizations/dto/create-organization.dto';
import { User } from 'src/resources/users/entities/user.entity';
import { CreateUserDto } from 'src/resources/users/dto/create-user.dto';
import { LoginDto, UserType } from 'src/resources/authentication/dto/login.dto';
import { ForgotPasswordDto } from 'src/resources/authentication/dto/forgot-password.dto';
import { VerifyResetOtpDto } from 'src/resources/authentication/dto/verify-reset-otp.dto';
import { ResetPasswordDto } from 'src/resources/authentication/dto/reset-password.dto';
import { UserRole } from 'src/common/enums/roles.enum';
import { UserStatus } from 'src/resources/users/entities/user.entity';

/**
 * Test Factories
 * 
 * Provides factory functions for creating test data
 */

export interface OrganizationFactoryOptions {
  id?: string;
  name?: string;
  slug?: string;
  domain?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  billingEmail?: string;
  email?: string;
  description?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  timezone?: string;
  settings?: object;
  logoUrl?: string;
  updatedAt?: string | Date;
}

/**
 * Create a test organization DTO with default values
 */
export const createOrganizationDto = (
  overrides: Partial<CreateOrganizationDto> = {}
): CreateOrganizationDto => {
  const defaults: CreateOrganizationDto = {
    name: 'Test Organization',
    slug: 'test-org',
    domain: 'test.com',
    status: 'ACTIVE',
    billingEmail: 'billing@test.com',
    email: 'contact@test.com',
    description: 'Test organization description',
    website: 'https://test.com',
    address: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    postalCode: '12345',
    phone: '+1234567890',
    timezone: 'UTC',
    settings: {},
  };

  return { ...defaults, ...overrides };
};

/**
 * Create a test organization entity with default values
 */
export const createOrganizationEntity = (
  overrides: Partial<OrganizationFactoryOptions> = {}
): Partial<Organization> => {
  const defaults: Partial<Organization> = {
    id: 'test-org-id',
    name: 'Test Organization',
    slug: 'test-org',
    domain: 'test.com',
    status: 'ACTIVE',
    billingEmail: 'billing@test.com',
    email: 'contact@test.com',
    description: 'Test organization description',
    website: 'https://test.com',
    address: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    postalCode: '12345',
    phone: '+1234567890',
    timezone: 'UTC',
    settings: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };

  // Convert Date to string if provided and ensure all date fields are strings
  const processedOverrides: any = { ...overrides };
  if (processedOverrides.updatedAt instanceof Date) {
    processedOverrides.updatedAt = processedOverrides.updatedAt.toISOString();
  }

  return { ...defaults, ...processedOverrides } as Partial<Organization>;
};

/**
 * Create multiple test organizations
 */
export const createMultipleOrganizations = (
  count: number,
  baseOptions: Partial<OrganizationFactoryOptions> = {}
): Partial<Organization>[] => {
  return Array.from({ length: count }, (_, index) =>
    createOrganizationEntity({
      ...baseOptions,
      name: `${baseOptions.name || 'Test Organization'} ${index + 1}`,
      slug: `${baseOptions.slug || 'test-org'}-${index + 1}`,
      domain: `${baseOptions.domain || 'test'}-${index + 1}.com`,
    })
  );
};

/**
 * Create an inactive organization (for deletion tests)
 */
export const createInactiveOrganization = (
  overrides: Partial<OrganizationFactoryOptions> = {}
): Partial<Organization> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 31);

  return createOrganizationEntity({
    ...overrides,
    status: 'INACTIVE',
    updatedAt: thirtyDaysAgo.toISOString(),
  });
};

/**
 * Create a suspended organization
 */
export const createSuspendedOrganization = (
  overrides: Partial<OrganizationFactoryOptions> = {}
): Partial<Organization> => {
  return createOrganizationEntity({
    ...overrides,
    status: 'SUSPENDED',
    settings: {
      suspensionReason: 'Test suspension',
      suspendedAt: new Date(),
    },
  });
};

// ============================================================================
// Authentication Test Factories
// ============================================================================

export interface UserFactoryOptions {
  id?: string;
  organizationId?: string;
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role?: UserRole;
  status?: UserStatus;
  socialProvider?: string;
  socialId?: string;
  settings?: any;
}

/**
 * Create a test user DTO with default values
 */
export const createUserDto = (
  overrides: Partial<CreateUserDto> = {}
): CreateUserDto => {
  const defaults: CreateUserDto = {
    organizationId: 'test-org-id',
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
  };

  return { ...defaults, ...overrides };
};

/**
 * Create a test user entity with default values
 */
export const createUserEntity = (
  overrides: Partial<UserFactoryOptions> = {}
): Partial<User> => {
  const defaults: Partial<User> = {
    id: 'test-user-id',
    organizationId: 'test-org-id',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };

  // Convert Date to string if provided and ensure all date fields are strings
  const processedOverrides: any = { ...overrides };
  if (processedOverrides.createdAt instanceof Date) {
    processedOverrides.createdAt = processedOverrides.createdAt.toISOString();
  }
  if (processedOverrides.updatedAt instanceof Date) {
    processedOverrides.updatedAt = processedOverrides.updatedAt.toISOString();
  }

  return { ...defaults, ...processedOverrides } as Partial<User>;
};

/**
 * Create a test login DTO with default values
 */
export const createLoginDto = (
  overrides: Partial<LoginDto> = {}
): LoginDto => {
  const defaults: LoginDto = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    userType: UserType.USER,
  };

  return { ...defaults, ...overrides };
};

/**
 * Create a test forgot password DTO with default values
 */
export const createForgotPasswordDto = (
  overrides: Partial<ForgotPasswordDto> = {}
): ForgotPasswordDto => {
  const defaults: ForgotPasswordDto = {
    email: 'test@example.com',
    userType: UserType.USER,
  };

  return { ...defaults, ...overrides };
};

/**
 * Create a test verify reset OTP DTO with default values
 */
export const createVerifyResetOtpDto = (
  overrides: Partial<VerifyResetOtpDto> = {}
): VerifyResetOtpDto => {
  const defaults: VerifyResetOtpDto = {
    email: 'test@example.com',
    userType: UserType.USER,
    otp: '123456',
  };

  return { ...defaults, ...overrides };
};

/**
 * Create a test reset password DTO with default values
 */
export const createResetPasswordDto = (
  overrides: Partial<ResetPasswordDto> = {}
): ResetPasswordDto => {
  const defaults: ResetPasswordDto = {
    email: 'test@example.com',
    userType: UserType.USER,
    newPassword: 'NewPassword123!',
    otp: '123456',
  };

  return { ...defaults, ...overrides };
};

/**
 * Create an inactive user (for inactive account tests)
 */
export const createInactiveUser = (
  overrides: Partial<UserFactoryOptions> = {}
): Partial<User> => {
  return createUserEntity({
    ...overrides,
    status: UserStatus.INACTIVE,
  });
};

/**
 * Create a social user without password (for social auth tests)
 */
export const createSocialUser = (
  overrides: Partial<UserFactoryOptions> = {}
): Partial<User> => {
  return createUserEntity({
    ...overrides,
    passwordHash: null,
    socialProvider: 'google',
    socialId: 'google-123456',
  });
};

