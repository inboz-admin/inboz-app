import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Subscription, SubscriptionStatus, BillingCycle } from '../entities/subscription.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { InvoiceGenerationService } from './invoice-generation.service';
import { SubscriptionPaymentService } from './subscription-payment.service';
import { PricingCalculationService } from './pricing-calculation.service';
import { PeriodCalculationService } from './period-calculation.service';
import { QuotaManagementService } from 'src/common/services/quota-management.service';

@Injectable()
export class SubscriptionRenewalService {
  private readonly logger = new Logger(SubscriptionRenewalService.name);

  constructor(
    @InjectModel(Subscription)
    private readonly subscriptionModel: typeof Subscription,
    @InjectModel(SubscriptionPlan)
    private readonly subscriptionPlanModel: typeof SubscriptionPlan,
    private readonly invoiceGenerationService: InvoiceGenerationService,
    @Inject(forwardRef(() => SubscriptionPaymentService))
    private readonly subscriptionPaymentService: SubscriptionPaymentService,
    private readonly pricingCalculationService: PricingCalculationService,
    private readonly periodCalculationService: PeriodCalculationService,
    private readonly quotaManagementService: QuotaManagementService,
  ) {}

  /**
   * Check for subscriptions due for renewal (expiring in 7 days)
   */
  async checkRenewals(): Promise<void> {
    try {
      const now = new Date();
      const sevenDaysFromNow = new Date(now);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const subscriptionsDueForRenewal = await this.subscriptionModel.findAll({
        where: {
          currentPeriodEnd: {
            [Op.between]: [now, sevenDaysFromNow],
          },
          status: SubscriptionStatus.ACTIVE,
          // Skip if cancelAt is set (user has cancelled)
          cancelAt: null,
        },
      });

      this.logger.log(`Found ${subscriptionsDueForRenewal.length} subscriptions due for renewal`);

      for (const subscription of subscriptionsDueForRenewal) {
        // Generate renewal invoice
        try {
          await this.generateRenewalInvoice(subscription.id);
        } catch (error) {
          this.logger.error(
            `Failed to generate renewal invoice for subscription ${subscription.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error checking renewals:', error);
    }
  }

  /**
   * Generate renewal invoice for subscription
   */
  async generateRenewalInvoice(subscriptionId: string): Promise<void> {
    try {
      await this.invoiceGenerationService.generateRenewalInvoice(subscriptionId);
      this.logger.log(`Generated renewal invoice for subscription ${subscriptionId}`);
    } catch (error) {
      this.logger.error(`Failed to generate renewal invoice for subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Process auto-renewal for a subscription
   */
  async autoRenew(subscriptionId: string): Promise<void> {
    try {
      const subscription = await this.subscriptionModel.findByPk(subscriptionId);

      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found`);
      }

      // Skip if cancelled
      if (subscription.cancelAt) {
        this.logger.log(`Skipping auto-renewal for subscription ${subscriptionId} - user has cancelled`);
        return;
      }

      // Check payment provider and payment method
      const { PaymentProvider } = await import('src/common/enums/payment-provider.enum');
      const paymentProvider = subscription.paymentProvider || PaymentProvider.RAZORPAY;

      if (paymentProvider === PaymentProvider.STRIPE) {
        // Stripe subscriptions are handled automatically via webhooks
        // Skip manual renewal for Stripe subscriptions
        this.logger.log(`Skipping manual renewal for Stripe subscription ${subscriptionId} - handled by webhooks`);
        return;
      }

      // For Razorpay, check if customer ID exists
      if (!subscription.razorpayCustomerId) {
        this.logger.warn(`No payment method found for subscription ${subscriptionId} - cannot auto-renew`);
        return;
      }

      // Generate renewal invoice
      await this.generateRenewalInvoice(subscriptionId);

      // TODO: Process payment automatically if payment method exists
      // This would require Razorpay subscription/recurring payment setup
      // For now, we just generate the invoice and let user pay manually

      this.logger.log(`Auto-renewal processed for subscription ${subscriptionId}`);
    } catch (error) {
      this.logger.error(`Error processing auto-renewal for subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Apply pending changes (user count reduction or plan downgrade) to subscription
   */
  async applyPendingChanges(subscription: Subscription): Promise<void> {
    let updatedUserCount = subscription.userCount;
    let updatedPlanId = subscription.planId;
    let needsPricingRecalculation = false;

    // Apply pending user count reduction
    if (subscription.pendingUserCount !== null && subscription.pendingUserCount !== undefined) {
      updatedUserCount = subscription.pendingUserCount;
      needsPricingRecalculation = true;
      this.logger.log(
        `Applying pending user count reduction for subscription ${subscription.id}: ${subscription.userCount} → ${updatedUserCount}`,
      );
    }

    // Apply pending plan downgrade
    if (subscription.pendingPlanId) {
      updatedPlanId = subscription.pendingPlanId;
      needsPricingRecalculation = true;
      const newPlan = await this.subscriptionPlanModel.findByPk(updatedPlanId);
      this.logger.log(
        `Applying pending plan downgrade for subscription ${subscription.id}: ${subscription.planId} → ${updatedPlanId} (${newPlan?.name || 'Unknown'})`,
      );
    }

    // Recalculate pricing if changes were applied
    if (needsPricingRecalculation) {
      const pricingResult = await this.pricingCalculationService.calculateSubscriptionPrice(
        updatedPlanId,
        updatedUserCount,
        subscription.billingCycle,
      );

      await this.subscriptionModel.update(
        {
          userCount: updatedUserCount,
          planId: updatedPlanId,
          amount: pricingResult.basePricePerUser * updatedUserCount,
          volumeDiscountPercent: pricingResult.volumeDiscountPercent,
          finalAmount: pricingResult.totalAmount,
          pendingUserCount: null,
          pendingPlanId: null,
          pendingChangeReason: null,
        },
        {
          where: { id: subscription.id },
        },
      );

      this.logger.log(
        `Applied pending changes to subscription ${subscription.id}. New pricing: $${pricingResult.totalAmount} for ${updatedUserCount} users.`,
      );

      // Clear quota cache for the organization to reflect new plan/user limits
      await this.quotaManagementService.clearCache(undefined, subscription.organizationId);
      this.logger.debug(`Cleared quota cache for organization ${subscription.organizationId} after applying pending changes`);
    }
  }

  /**
   * Process automatic renewal workflow after payment verification
   */
  async processAutoRenewal(subscriptionId: string): Promise<void> {
    try {
      const subscription = await this.subscriptionModel.findByPk(subscriptionId);

      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found`);
      }

      // Apply any pending changes (user count reduction or plan downgrade) before renewal
      await this.applyPendingChanges(subscription);

      // Reload subscription to get updated values after applying pending changes
      const updatedSubscription = await this.subscriptionModel.findByPk(subscriptionId);
      if (!updatedSubscription) {
        throw new Error(`Subscription ${subscriptionId} not found after applying pending changes`);
      }

      // Calculate next period dates
      const nextPeriodStart = new Date(updatedSubscription.currentPeriodEnd || new Date());
      const nextPeriodEnd = this.periodCalculationService.calculatePeriodEnd(
        nextPeriodStart,
        updatedSubscription.billingCycle,
      );

      // Update subscription with new period
      await this.subscriptionModel.update(
        {
          currentPeriodStart: nextPeriodStart,
          currentPeriodEnd: nextPeriodEnd,
          status: SubscriptionStatus.ACTIVE,
        },
        {
          where: { id: subscriptionId },
        },
      );

      this.logger.log(
        `Subscription ${subscriptionId} renewed until ${nextPeriodEnd.toISOString()}`,
      );

      // Clear quota cache for the organization to reflect any changes from renewal
      await this.quotaManagementService.clearCache(undefined, updatedSubscription.organizationId);
      this.logger.debug(`Cleared quota cache for organization ${updatedSubscription.organizationId} after subscription renewal`);
    } catch (error) {
      this.logger.error(`Error processing auto-renewal for subscription ${subscriptionId}:`, error);
      throw error;
    }
  }
}

