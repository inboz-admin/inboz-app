import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SocialUserDataDto } from './dto/social-user-data.dto';
import { JwtService } from 'src/configuration/jwt/jwt.service';
import { UserRole } from 'src/common/enums/roles.enum';
import { CryptoUtilityService } from 'src/common/services/crypto-utility.service';
import { TransactionManager } from 'src/common/services/transaction-manager.service';
import { SubscriptionQueue } from 'src/configuration/bull/queues/subscription.queue';
import { EmailQueue } from 'src/configuration/bull/queues/email.queue';
import { PlanLimitValidationService } from 'src/common/services/plan-limit-validation.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { User, UserStatus } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { GmailOAuthToken } from '../users/entities/gmail-oauth-token.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';
import {
  extractEmailDomain,
} from './utils/email-domain.util';
import { generateUniqueOrgSlug } from 'src/common/utils/slug-generator.util';
import { generateRandomOrgName } from 'src/common/utils/org-name-generator.util';
import { validateEmailDomain as validateEmailDomainUtil } from 'src/common/utils/email-domain-validation.util';
import { Transaction } from 'sequelize';
import { AuthResponse } from './utils/auth-response.interface';
import { ERRORS, TOKEN_EXPIRY } from './utils/auth.constants';
import axios from 'axios';
import { GmailTokenStatus } from '../users/entities/gmail-oauth-token.entity';

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly cryptoUtilityService: CryptoUtilityService,
    private readonly subscriptionQueue: SubscriptionQueue,
    private readonly emailQueue: EmailQueue,
    private readonly transactionManager: TransactionManager,
    private readonly planLimitValidationService: PlanLimitValidationService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  validateEmailDomain(email: string): void {
    validateEmailDomainUtil(email);
  }

  private async findOrCreateOrganization(
    userEmail: string,
    transaction: Transaction,
  ): Promise<{ organization: Organization; isNew: boolean }> {
    if (!userEmail) {
      throw new BadRequestException(`${ERRORS.EMAIL_REQUIRED} to create organization`);
    }

    this.validateEmailDomain(userEmail);

    const emailDomain = extractEmailDomain(userEmail);
    
    // Generate unique UUID-based slug
    const orgSlug = await generateUniqueOrgSlug(transaction);
    
    // Generate random organization name
    const orgName = generateRandomOrgName();

    const organizationData = {
      name: orgName,
      slug: orgSlug,
      domain: emailDomain,
      timezone: 'UTC',
      description: `Organization for ${userEmail}`,
      website: `https://${emailDomain}`,
      email: userEmail,
      billingEmail: userEmail,
      status: 'ACTIVE',
      settings: {
        defaultLanguage: 'en',
        notificationSettings: {
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
        },
      },
    };

    const newOrganization = await Organization.create(organizationData, {
      transaction,
    });

    this.logger.log(`Created new organization: ${newOrganization.id} for email: ${userEmail}`);
    
    // Note: Organization creation will be logged after transaction commits in validateOrCreateSocialUser
    
    return { organization: newOrganization, isNew: true };
  }

  private async findOrCreateUser(
    socialData: SocialUserDataDto,
    transaction: Transaction,
  ): Promise<{ user: User; isNew: boolean; organization: Organization; isNewOrg: boolean }> {
    const user = await User.findOne({
      where: { email: socialData.email },
      include: [
        {
          model: Organization,
          required: false,
          attributes: ['id', 'name', 'slug', 'domain'],
        },
      ],
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });

    if (user) {
      if (user.status === UserStatus.INACTIVE) {
        user.status = UserStatus.ACTIVE;
      }

      user.socialId = socialData.socialId;
      user.socialProvider = socialData.socialProvider;

      if (socialData.avatar) {
        user.avatarUrl = socialData.avatar;
      }
      if (!user.firstName && socialData.firstName) {
        user.firstName = socialData.firstName;
      }
      if (!user.lastName && socialData.lastName) {
        user.lastName = socialData.lastName;
      }

      await user.save({ transaction });

      const organization = user.organization ?? (await Organization.findByPk(user.organizationId, { transaction }));

      return { user, isNew: false, organization, isNewOrg: false };
    }

    this.validateEmailDomain(socialData.email);

    // Always create new organization for each user (no domain-based lookup)
    const orgResult = await this.findOrCreateOrganization(
      socialData.email,
      transaction
    );
    const organization = orgResult.organization;
    const isNewOrg = orgResult.isNew;

    // Since we always create new org, no need to check user limit for existing org
    // First user in new org is always ADMIN
    const userRole = UserRole.ADMIN;

    const newUser = await User.create(
      {
        email: socialData.email,
        firstName: socialData.firstName,
        lastName: socialData.lastName,
        avatarUrl: socialData.avatar,
        socialId: socialData.socialId,
        socialProvider: socialData.socialProvider,
        status: UserStatus.ACTIVE,
        role: userRole,
        organizationId: organization.id,
      },
      { transaction },
    );

    await newUser.update({ createdBy: newUser.id }, { transaction });

    if (isNewOrg) {
      organization.createdBy = newUser.id;
      await organization.save({ transaction });
    }

    newUser.organization = organization;

    // Note: User creation will be logged after transaction commits in validateOrCreateSocialUser

    return { user: newUser, isNew: true, organization, isNewOrg };
  }

  private async ensureGmailToken(
    user: User,
    socialData: SocialUserDataDto,
    transaction: Transaction,
  ): Promise<void> {
    if (!socialData.accessToken || socialData.socialProvider !== 'google') {
      return;
    }

    const existingToken = await GmailOAuthToken.findOne({
      where: { userId: user.id },
      transaction,
    });

    const grantedScopes =
      socialData.scopes && socialData.scopes.length > 0
        ? socialData.scopes
        : [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'openid',
          ];

    if (existingToken) {
      existingToken.accessTokenEncrypted = await this.cryptoUtilityService.encrypt(
        socialData.accessToken,
      );
      if (socialData.refreshToken) {
        existingToken.refreshTokenEncrypted = await this.cryptoUtilityService.encrypt(
          socialData.refreshToken,
        );
      }
      
      const wasRevoked = existingToken.status === GmailTokenStatus.REVOKED;
      
      if (socialData.scopes && socialData.scopes.length > 0) {
        if (wasRevoked) {
          // If token was revoked, REPLACE scopes with new ones (fresh authorization)
          existingToken.scopes = socialData.scopes;
        } else {
          // Merge scopes for incremental authorization (adding new scopes to existing)
          const existingScopes = existingToken.scopes || [];
          const newScopes = socialData.scopes;
          const mergedScopes = [...new Set([...existingScopes, ...newScopes])];
          existingToken.scopes = mergedScopes;
        }
      }
      
      const now = new Date();
      existingToken.tokenExpiresAt = new Date(Date.now() + TOKEN_EXPIRY.ACCESS_TOKEN_MS);
      existingToken.lastUsedAt = now;
      existingToken.grantedAt = now;
      
      // Reactivate token if it was previously revoked (new login after revocation)
      if (wasRevoked) {
        existingToken.status = GmailTokenStatus.ACTIVE;
        existingToken.revokedAt = null;
      }
      await existingToken.save({ transaction });
    } else {
      // Set quota reset to UTC midnight (global reset)
      // This ensures users get quota reset at UTC midnight
      const quotaResetAt = new Date();
      quotaResetAt.setUTCDate(quotaResetAt.getUTCDate() + 1);
      quotaResetAt.setUTCHours(0, 0, 0, 0);

      const now = new Date();
      await GmailOAuthToken.create(
        {
          userId: user.id,
          organizationId: user.organizationId ?? user.organization?.id,
          email: user.email,
          accessTokenEncrypted: await this.cryptoUtilityService.encrypt(socialData.accessToken),
          refreshTokenEncrypted: socialData.refreshToken
            ? await this.cryptoUtilityService.encrypt(socialData.refreshToken)
            : '',
          tokenExpiresAt: new Date(Date.now() + TOKEN_EXPIRY.ACCESS_TOKEN_MS),
          scopes: grantedScopes,
          grantedAt: now,
          consentGivenAt: now,
          consentVersion: '1.0',
          dataRetentionUntil: new Date(Date.now() + TOKEN_EXPIRY.DATA_RETENTION_MS),
          status: 'ACTIVE',
          lastUsedAt: now,
          quotaResetAt: quotaResetAt,
          dailyQuotaUsed: 0,
        },
        { transaction },
      );
    }
  }

  private buildAuthResponse(
    user: User,
    _organization: Organization | undefined,
    tokens: { accessToken: string; refreshToken: string },
  ): AuthResponse {
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: {
        id: Number(user.id),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    };
  }

  private buildJwtPayload(user: User, organization?: Organization) {
    return {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      organizationId: user.organizationId,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      organization: {
        id: organization?.id || user.organizationId,
        name: organization?.name,
        slug: organization?.slug,
        domain: organization?.domain,
      },
    };
  }

  async validateOrCreateSocialUser(socialData: SocialUserDataDto): Promise<AuthResponse> {
    let isNewOrg = false;
    let isNewUser = false;
    let organization: Organization | null = null;

    const result = await this.transactionManager.execute(async (transaction) => {
      const userResult = await this.findOrCreateUser(socialData, transaction);
      const { user, isNew, organization: org, isNewOrg: orgIsNew } = userResult;

      isNewUser = isNew;
      isNewOrg = orgIsNew;
      organization = org;

      await this.ensureGmailToken(user, socialData, transaction);

      const payload = this.buildJwtPayload(user, organization);
      const tokens = await this.jwtService.generateTokens(payload);

      return { user, organization, tokens };
    });

    // Log audit events after transaction commits (for new entities created during signup)
    if (isNewOrg && organization?.id) {
      // Log organization creation
      try {
        await this.auditLogsService.createAuditLog({
          organizationId: organization.id,
          performedByUserId: result.user?.id || organization.createdBy,
          module: 'ORGANIZATIONS',
          action: AuditAction.CREATE,
          recordId: organization.id,
          description: `Organization "${organization.name}" created during signup`,
          details: {
            organizationName: organization.name,
            organizationSlug: organization.slug,
            userEmail: socialData.email,
          },
        });
      } catch (error) {
        this.logger.warn('Failed to log organization creation:', error);
      }
    }

    if (isNewUser && result.user?.id) {
      // Log user creation
      try {
        await this.auditLogsService.createAuditLog({
          organizationId: organization?.id,
          performedByUserId: result.user.id,
          module: 'USERS',
          action: AuditAction.CREATE,
          recordId: result.user.id,
          description: `User "${result.user.firstName} ${result.user.lastName}" (${result.user.email}) created during signup`,
          details: {
            userEmail: result.user.email,
            userRole: result.user.role,
            organizationId: organization?.id,
          },
        });
      } catch (error) {
        this.logger.warn('Failed to log user creation:', error);
      }
    }

    // Only create subscription for new organizations
    if (isNewOrg && organization?.id) {
      try {
        await this.subscriptionQueue.createDefaultSubscription(organization.id);
        this.logger.log(`Queued subscription creation for new organization ${organization.id}`);
        
        // Log subscription creation in audit log
        try {
          await this.auditLogsService.createAuditLog({
            organizationId: organization.id,
            performedByUserId: result.user?.id,
            module: 'SUBSCRIPTIONS',
            action: AuditAction.CREATE,
            recordId: organization.id, // Will be updated when subscription is actually created
            description: `Default subscription queued for organization "${organization.name}" during signup`,
            details: {
              organizationId: organization.id,
              organizationName: organization.name,
              triggeredBy: 'auto_signup',
            },
          });
        } catch (error) {
          this.logger.warn('Failed to log subscription creation:', error);
        }
      } catch (error) {
        this.logger.error(`Failed to queue subscription creation for organization ${organization.id}:`, error);
      }
    }

    if (isNewUser && result.user) {
      try {
        const userName = [result.user.firstName, result.user.lastName].filter(Boolean).join(' ') || result.user.email;
        await this.emailQueue.sendWelcomeEmail(result.user.email, userName);
      } catch (error) {
        this.logger.error(`Failed to queue welcome email for user ${result.user.id}:`, error);
      }
    }

    return this.buildAuthResponse(result.user, result.organization, result.tokens);
  }

  async getUserScopes(userId: string): Promise<{
    scopes: string[];
    hasEmail: boolean;
    hasProfile: boolean;
    hasGmailReadonly: boolean;
    hasGmailSend: boolean;
    hasAllGmailScopes: boolean;
    tokenStatus?: GmailTokenStatus;
    tokenEmail?: string;
    needsReAuth?: boolean;
  }> {
    // Check for any token (not just ACTIVE) to get status
    const token = await GmailOAuthToken.findOne({
      where: {
        userId,
      },
      order: [['createdAt', 'DESC']], // Get most recent token
    });

    if (!token) {
      return {
        scopes: [],
        hasEmail: false,
        hasProfile: false,
        hasGmailReadonly: false,
        hasGmailSend: false,
        hasAllGmailScopes: false,
        tokenStatus: undefined,
        tokenEmail: undefined,
        needsReAuth: true,
      };
    }

    // Only need re-auth if refresh token is invalid/revoked (can't auto-refresh)
    // EXPIRED status means access token expired but refresh token is still valid (can auto-refresh)
    const needsReAuth = token.status === GmailTokenStatus.INVALID || 
                        token.status === GmailTokenStatus.REVOKED;

    // If refresh token is invalid/revoked, user must re-authenticate
    if (needsReAuth) {
      return {
        scopes: token.scopes || [],
        hasEmail: false,
        hasProfile: false,
        hasGmailReadonly: false,
        hasGmailSend: false,
        hasAllGmailScopes: false,
        tokenStatus: token.status,
        tokenEmail: token.email || undefined,
        needsReAuth: true,
      };
    }

    // If token is EXPIRED, it can still be auto-refreshed, so treat as active for UI
    // The system will automatically refresh it when needed
    if (token.status === GmailTokenStatus.EXPIRED) {
      // Return scopes as if active - system will auto-refresh
      const scopes = token.scopes || [];
      const gmailReadonlyScope = 'https://www.googleapis.com/auth/gmail.readonly';
      const gmailSendScope = 'https://www.googleapis.com/auth/gmail.send';
      const emailScope = 'email';
      const profileScope = 'profile';
      const openidScope = 'openid';
      const userinfoEmailScope = 'https://www.googleapis.com/auth/userinfo.email';
      const userinfoProfileScope = 'https://www.googleapis.com/auth/userinfo.profile';

      const hasEmail = scopes.includes(emailScope) || scopes.includes(userinfoEmailScope) || scopes.includes(openidScope);
      const hasProfile = scopes.includes(profileScope) || scopes.includes(userinfoProfileScope) || scopes.includes(openidScope);
      const hasGmailReadonly = scopes.includes(gmailReadonlyScope);
      const hasGmailSend = scopes.includes(gmailSendScope);
      const hasAllGmailScopes = hasGmailReadonly && hasGmailSend;

      return {
        scopes,
        hasEmail,
        hasProfile,
        hasGmailReadonly,
        hasGmailSend,
        hasAllGmailScopes,
        tokenStatus: GmailTokenStatus.ACTIVE, // Show as active since it can auto-refresh
        tokenEmail: token.email || undefined,
        needsReAuth: false,
      };
    }

    const scopes = token.scopes || [];
    const gmailReadonlyScope = 'https://www.googleapis.com/auth/gmail.readonly';
    const gmailSendScope = 'https://www.googleapis.com/auth/gmail.send';
    const emailScope = 'email';
    const profileScope = 'profile';
    const openidScope = 'openid';
    const userinfoEmailScope = 'https://www.googleapis.com/auth/userinfo.email';
    const userinfoProfileScope = 'https://www.googleapis.com/auth/userinfo.profile';

    const hasEmail = scopes.includes(emailScope) || scopes.includes(userinfoEmailScope) || scopes.includes(openidScope);
    const hasProfile = scopes.includes(profileScope) || scopes.includes(userinfoProfileScope) || scopes.includes(openidScope);
    const hasGmailReadonly = scopes.includes(gmailReadonlyScope);
    const hasGmailSend = scopes.includes(gmailSendScope);
    const hasAllGmailScopes = hasGmailReadonly && hasGmailSend;

    return {
      scopes,
      hasEmail,
      hasProfile,
      hasGmailReadonly,
      hasGmailSend,
      hasAllGmailScopes,
      tokenStatus: token.status,
      tokenEmail: token.email || undefined,
      needsReAuth: false,
    };
  }

  async revokeUserTokens(userId: string): Promise<void> {
    const token = await GmailOAuthToken.findOne({
      where: {
        userId,
        status: GmailTokenStatus.ACTIVE,
      },
    });

    if (!token) {
      this.logger.warn(`No active token found for user ${userId} to revoke`);
      return;
    }

    try {
      // Decrypt access token to revoke it
      const accessToken = await this.cryptoUtilityService.decrypt(
        token.accessTokenEncrypted,
      );

      // Revoke token at Google
      try {
        await axios.post(
          'https://oauth2.googleapis.com/revoke',
          new URLSearchParams({ token: accessToken }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        );
        this.logger.log(`Successfully revoked token at Google for user ${userId}`);
      } catch (error) {
        this.logger.error(
          `Failed to revoke token at Google for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        // Continue with local revocation even if Google revocation fails
      }

      // Update token status locally
      token.status = GmailTokenStatus.REVOKED;
      token.revokedAt = new Date();
      await token.save();

      this.logger.log(`Successfully revoked tokens for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to revoke tokens for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
