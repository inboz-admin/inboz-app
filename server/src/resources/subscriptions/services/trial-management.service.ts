import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import moment from 'moment-timezone';
import { SubscriptionsService } from '../subscriptions.service';
import { SubscriptionPlansService } from '../subscription-plans.service';
import { Subscription, SubscriptionStatus, BillingCycle } from '../entities/subscription.entity';
import { Currency } from '../entities/subscription-plan.entity';
import { Transaction } from 'sequelize';
import { TransactionManager } from 'src/common/services/transaction-manager.service';

export interface TrialStatus {
  isTrial: boolean;
  isExpired: boolean;
  daysRemaining: number;
  trialStart?: Date;
  trialEnd?: Date;
}

@Injectable()
export class TrialManagementService {
  private readonly logger = new Logger(TrialManagementService.name);
  private readonly TRIAL_DURATION_DAYS = 7;
  private readonly TRIAL_DAILY_EMAIL_LIMIT = 30;

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly subscriptionPlansService: SubscriptionPlansService,
    private readonly transactionManager: TransactionManager,
  ) {}

  /**
   * Create a 7-day trial subscription for an organization
   */
  async createTrialSubscription(organizationId: string): Promise<Subscription> {
    return await this.transactionManager.execute(async (transaction) => {
      // Find or create Free Trial plan
      let trialPlan = await this.subscriptionPlansService.findSubscriptionPlanByName('Free Trial');

      if (!trialPlan) {
        // Create trial plan if it doesn't exist
        trialPlan = await this.subscriptionPlansService.createSubscriptionPlan({
          name: 'Free Trial',
          description: '7-day free trial with Starter features and 30 emails per day',
          pricePerUserMonthly: 0,
          pricePerUserYearly: 0,
          dailyEmailLimit: this.TRIAL_DAILY_EMAIL_LIMIT,
          maxContacts: null,
          maxCampaigns: null,
          maxTemplates: null,
          maxUsers: null,
          features: {
            basic_analytics: true,
            email_support: true,
            campaign_templates: true,
            contact_management: true,
            basic_reporting: true,
          },
          isActive: true,
          isPublic: false, // Trial plan is not publicly visible
        });
      }

      const now = moment();
      const trialEndDate = moment(now).add(this.TRIAL_DURATION_DAYS, 'days');

      // Create trial subscription
      const subscription = await this.subscriptionsService.createSubscription(
        {
          organizationId,
          planId: trialPlan.id,
          status: SubscriptionStatus.TRIAL,
          billingCycle: BillingCycle.MONTHLY,
          amount: 0,
          currency: Currency.USD,
          trialStart: now.toISOString(),
          trialEnd: trialEndDate.toISOString(),
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: trialEndDate.toISOString(),
          userCount: 1, // Start with 1 user
          volumeDiscountPercent: 0,
          finalAmount: 0,
        },
        transaction,
      );

      this.logger.log(
        `Created 7-day trial subscription for organization ${organizationId}. Trial ends on ${trialEndDate.toISOString()}`,
      );

      return subscription;
    });
  }

  /**
   * Check trial expiry status for an organization
   */
  async checkTrialExpiry(organizationId: string): Promise<TrialStatus> {
    const subscription = await this.subscriptionsService.findActiveSubscriptionByOrganizationId(
      organizationId,
    );

    if (!subscription) {
      throw new NotFoundException(`No subscription found for organization ${organizationId}`);
    }

    const isTrial = subscription.status === SubscriptionStatus.TRIAL;

    if (!isTrial) {
      return {
        isTrial: false,
        isExpired: false,
        daysRemaining: 0,
      };
    }

    if (!subscription.trialEnd) {
      // Trial without end date - consider it expired
      return {
        isTrial: true,
        isExpired: true,
        daysRemaining: 0,
        trialStart: subscription.trialStart,
        trialEnd: subscription.trialEnd,
      };
    }

    const now = moment();
    const trialEnd = moment(subscription.trialEnd);
    const isExpired = trialEnd.isBefore(now);

    const daysRemaining = Math.max(0, trialEnd.diff(now, 'days', true));

    return {
      isTrial: true,
      isExpired,
      daysRemaining,
      trialStart: subscription.trialStart,
      trialEnd: subscription.trialEnd,
    };
  }

  /**
   * Get remaining days in trial
   */
  async getTrialDaysRemaining(organizationId: string): Promise<number> {
    const status = await this.checkTrialExpiry(organizationId);
    return status.daysRemaining;
  }

  /**
   * Expire a trial subscription and freeze the account
   */
  async expireTrial(organizationId: string): Promise<void> {
    await this.transactionManager.execute(async (transaction) => {
      const subscription = await this.subscriptionsService.findActiveSubscriptionByOrganizationId(
        organizationId,
      );

      if (!subscription) {
        this.logger.warn(`No subscription found for organization ${organizationId} when expiring trial`);
        return;
      }

      if (subscription.status !== SubscriptionStatus.TRIAL) {
        this.logger.warn(
          `Subscription ${subscription.id} is not a trial subscription. Status: ${subscription.status}`,
        );
        return;
      }

      // Check if trial is actually expired
      if (subscription.trialEnd && moment(subscription.trialEnd).isAfter(moment())) {
        this.logger.warn(
          `Trial for subscription ${subscription.id} has not expired yet. Trial ends on ${subscription.trialEnd}`,
        );
        return;
      }

      // Update subscription status to INCOMPLETE (expired state)
      await this.subscriptionsService.updateSubscription(
        subscription.id,
        {
          status: SubscriptionStatus.INCOMPLETE,
        },
      );

      this.logger.log(
        `Expired trial subscription ${subscription.id} for organization ${organizationId}`,
      );
    });
  }
}
