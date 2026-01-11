import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { SubscriptionsService } from 'src/resources/subscriptions/subscriptions.service';
import { User } from 'src/resources/users/entities/user.entity';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import { UserStatus } from 'src/resources/users/entities/user.entity';
import { ContactStatus } from 'src/resources/contacts/entities/contact.entity';
import { SubscriptionStatus } from 'src/resources/subscriptions/entities/subscription.entity';
import { Op } from 'sequelize';

export interface PlanLimitCheckResult {
  currentCount: number;
  maxLimit: number | null;
  wouldExceed: boolean;
  planName: string;
  limitType: 'users' | 'contacts';
  subscriptionId?: string;
  isTrial?: boolean;
}

@Injectable()
export class PlanLimitValidationService {
  private readonly logger = new Logger(PlanLimitValidationService.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    @InjectModel(User)
    private readonly userModel: typeof User,
    @InjectModel(Contact)
    private readonly contactModel: typeof Contact,
  ) {}

  /**
   * Check if adding users would exceed the plan limit
   * Checks against subscription.userCount first, then falls back to plan.maxUsers
   * 
   * IMPORTANT: This method only READS subscription.userCount for validation.
   * It does NOT modify or update subscription.userCount.
   * userCount should ONLY be updated during upgrade/payment flow.
   */
  async checkUserLimit(
    organizationId: string,
    additionalUsers: number = 1,
  ): Promise<PlanLimitCheckResult> {
    // Get active subscription with plan
    const subscription = await this.subscriptionsService.findActiveSubscriptionByOrganizationId(
      organizationId,
    );

    if (!subscription || !subscription.plan) {
      // No subscription or plan - allow (might be default/trial)
      return {
        currentCount: 0,
        maxLimit: null,
        wouldExceed: false,
        planName: 'No Plan',
        limitType: 'users',
      };
    }

    const plan = subscription.plan;
    
    // Count ALL users in the organization (both ACTIVE and INACTIVE)
    // Invited users are INACTIVE but still count toward the limit
    // Exclude SUSPENDED users
    const currentUserCount = await this.userModel.count({
      where: {
        organizationId,
        // Count all users regardless of status (ACTIVE, INACTIVE, but exclude SUSPENDED)
        status: {
          [Op.in]: [UserStatus.ACTIVE, UserStatus.INACTIVE],
        },
      },
    });

    // Special handling for TRIAL subscriptions: allow unlimited users
    if (subscription.status === SubscriptionStatus.TRIAL) {
      return {
        currentCount: currentUserCount,
        maxLimit: null, // No limit
        wouldExceed: false, // Always allow
        planName: plan.name,
        limitType: 'users',
        subscriptionId: subscription.id,
        isTrial: true,
      };
    }

    // For non-trial subscriptions, check against subscription.userCount first, then fallback to plan.maxUsers
    let maxUsers: number | null = null;
    if (subscription.userCount !== null && subscription.userCount !== undefined) {
      // Use subscription user count as the limit
      maxUsers = subscription.userCount;
    } else {
      // Fallback to plan maxUsers for backward compatibility
      maxUsers = plan.maxUsers;
    }

    // If maxUsers is null, it means unlimited
    if (maxUsers === null) {
      return {
        currentCount: currentUserCount,
        maxLimit: null,
        wouldExceed: false,
        planName: plan.name,
        limitType: 'users',
        subscriptionId: subscription.id,
        isTrial: false,
      };
    }

    const wouldExceed = currentUserCount + additionalUsers > maxUsers;

    return {
      currentCount: currentUserCount,
      maxLimit: maxUsers,
      wouldExceed,
      planName: plan.name,
      limitType: 'users',
      subscriptionId: subscription.id,
      isTrial: false,
    };
  }

  /**
   * Check if adding contacts would exceed the plan limit
   */
  async checkContactLimit(
    organizationId: string,
    additionalContacts: number = 1,
  ): Promise<PlanLimitCheckResult> {
    // Get active subscription with plan
    const subscription = await this.subscriptionsService.findActiveSubscriptionByOrganizationId(
      organizationId,
    );

    if (!subscription || !subscription.plan) {
      // No subscription or plan - allow (might be default/trial)
      return {
        currentCount: 0,
        maxLimit: null,
        wouldExceed: false,
        planName: 'No Plan',
        limitType: 'contacts',
      };
    }

    const plan = subscription.plan;
    const maxContacts = plan.maxContacts;

    // If maxContacts is null, it means unlimited
    if (maxContacts === null) {
      return {
        currentCount: 0,
        maxLimit: null,
        wouldExceed: false,
        planName: plan.name,
        limitType: 'contacts',
      };
    }

    // Count current active contacts in the organization
    const currentContactCount = await this.contactModel.count({
      where: {
        organizationId,
        status: ContactStatus.ACTIVE,
      },
    });

    const wouldExceed = currentContactCount + additionalContacts > maxContacts;

    return {
      currentCount: currentContactCount,
      maxLimit: maxContacts,
      wouldExceed,
      planName: plan.name,
      limitType: 'contacts',
    };
  }

  /**
   * Validate user limit and throw exception if exceeded
   */
  async validateUserLimit(
    organizationId: string,
    additionalUsers: number = 1,
  ): Promise<void> {
    const checkResult = await this.checkUserLimit(organizationId, additionalUsers);

    if (checkResult.wouldExceed) {
      const isTrial = checkResult.isTrial === true;

      const message = isTrial
        ? `Cannot add ${additionalUsers} user(s). Your trial subscription allows up to ${checkResult.maxLimit} users. You currently have ${checkResult.currentCount} users. Please upgrade your subscription to add more users.`
        : `Cannot add ${additionalUsers} user(s). Your ${checkResult.planName} subscription allows a maximum of ${checkResult.maxLimit} users. You currently have ${checkResult.currentCount} users.`;

      throw new BadRequestException({
        message,
        limitExceeded: true,
        currentCount: checkResult.currentCount,
        maxLimit: checkResult.maxLimit,
        planName: checkResult.planName,
        limitType: checkResult.limitType,
        subscriptionId: checkResult.subscriptionId,
      });
    }
  }

  /**
   * Validate contact limit and throw exception if exceeded
   */
  async validateContactLimit(
    organizationId: string,
    additionalContacts: number = 1,
  ): Promise<void> {
    const checkResult = await this.checkContactLimit(organizationId, additionalContacts);

    if (checkResult.wouldExceed) {
      throw new BadRequestException({
        message: `Cannot add ${additionalContacts} contact(s). Your ${checkResult.planName} plan allows a maximum of ${checkResult.maxLimit} contacts. You currently have ${checkResult.currentCount} contacts.`,
        limitExceeded: true,
        currentCount: checkResult.currentCount,
        maxLimit: checkResult.maxLimit,
        planName: checkResult.planName,
        limitType: checkResult.limitType,
      });
    }
  }
}

