import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize, Transaction } from 'sequelize';
import { Subscription, SubscriptionStatus, BillingCycle } from '../entities/subscription.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { User, UserStatus } from 'src/resources/users/entities/user.entity';
import { SubscriptionsService } from '../subscriptions.service';
import { SubscriptionPlansService } from '../subscription-plans.service';
import { InvoiceGenerationService } from './invoice-generation.service';
import { RazorpayService } from 'src/resources/payments/razorpay.service';
import { StripeService } from 'src/resources/payments/stripe.service';
import { PaymentProvider } from 'src/common/enums/payment-provider.enum';
import { SubscriptionRenewalService } from './subscription-renewal.service';
import { PricingCalculationService } from './pricing-calculation.service';
import { ProrationCalculationService } from './proration-calculation.service';
import { PeriodCalculationService } from './period-calculation.service';
import { QuotaManagementService } from 'src/common/services/quota-management.service';

@Injectable()
export class SubscriptionPaymentService {
  private readonly logger = new Logger(SubscriptionPaymentService.name);

  constructor(
    @InjectModel(Subscription)
    private readonly subscriptionModel: typeof Subscription,
    @InjectModel(SubscriptionPlan)
    private readonly subscriptionPlanModel: typeof SubscriptionPlan,
    @InjectModel(Organization)
    private readonly organizationModel: typeof Organization,
    @InjectModel(Invoice)
    private readonly invoiceModel: typeof Invoice,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly subscriptionPlansService: SubscriptionPlansService,
    private readonly invoiceGenerationService: InvoiceGenerationService,
    private readonly razorpayService: RazorpayService,
    private readonly stripeService: StripeService,
    @Inject(forwardRef(() => SubscriptionRenewalService))
    private readonly subscriptionRenewalService: SubscriptionRenewalService,
    private readonly pricingCalculationService: PricingCalculationService,
    private readonly prorationCalculationService: ProrationCalculationService,
    private readonly periodCalculationService: PeriodCalculationService,
    private readonly quotaManagementService: QuotaManagementService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get or create payment customer for an organization
   * Reuses existing customer ID from subscription if available
   * Supports both Razorpay and Stripe
   */
  private async getOrCreatePaymentCustomer(
    organization: Organization,
    paymentProvider: PaymentProvider,
    existingSubscription?: Subscription,
  ): Promise<{ razorpayCustomerId?: string | null; stripeCustomerId?: string | null }> {
    const result: { razorpayCustomerId?: string | null; stripeCustomerId?: string | null } = {};

    if (paymentProvider === PaymentProvider.RAZORPAY) {
      // First, try to reuse customer ID from existing subscription
      if (existingSubscription?.razorpayCustomerId) {
        result.razorpayCustomerId = existingSubscription.razorpayCustomerId;
        this.logger.log(`Reusing Razorpay customer ID ${result.razorpayCustomerId} from existing subscription ${existingSubscription.id}`);
        return result;
      }

      // If not found, search for customer ID in any other subscription for this organization
      const subscriptionWithCustomer = await this.subscriptionModel.findOne({
        where: {
          organizationId: organization.id,
          razorpayCustomerId: { [Op.ne]: null },
        },
        order: [['createdAt', 'DESC']], // Get most recent one
        attributes: ['razorpayCustomerId'],
      });

      if (subscriptionWithCustomer?.razorpayCustomerId) {
        result.razorpayCustomerId = subscriptionWithCustomer.razorpayCustomerId;
        this.logger.log(`Found existing Razorpay customer ID ${result.razorpayCustomerId} from previous subscription for organization ${organization.id}`);
        return result;
      }

      // Create new Razorpay customer
      try {
        const customer = await this.razorpayService.createCustomer(organization);
        if (customer && customer.id) {
          result.razorpayCustomerId = customer.id;
          this.logger.log(`Created new Razorpay customer ${result.razorpayCustomerId} for organization ${organization.id}`);
          return result;
        }
      } catch (customerError: any) {
        const errorMsg = customerError?.message || '';
        if (
          !errorMsg.toLowerCase().includes('already exists') &&
          !errorMsg.toLowerCase().includes('customer already exists')
        ) {
          throw customerError;
        }
        this.logger.warn(
          `Razorpay customer exists for organization ${organization.id} but could not be retrieved.`,
        );
      }
      result.razorpayCustomerId = null;
    } else if (paymentProvider === PaymentProvider.STRIPE) {
      // First, try to reuse customer ID from existing subscription
      if (existingSubscription?.stripeCustomerId) {
        result.stripeCustomerId = existingSubscription.stripeCustomerId;
        this.logger.log(`Reusing Stripe customer ID ${result.stripeCustomerId} from existing subscription ${existingSubscription.id}`);
        return result;
      }

      // If not found, search for customer ID in any other subscription for this organization
      const subscriptionWithCustomer = await this.subscriptionModel.findOne({
        where: {
          organizationId: organization.id,
          stripeCustomerId: { [Op.ne]: null },
        },
        order: [['createdAt', 'DESC']], // Get most recent one
        attributes: ['stripeCustomerId'],
      });

      if (subscriptionWithCustomer?.stripeCustomerId) {
        result.stripeCustomerId = subscriptionWithCustomer.stripeCustomerId;
        this.logger.log(`Found existing Stripe customer ID ${result.stripeCustomerId} from previous subscription for organization ${organization.id}`);
        return result;
      }

      // Create new Stripe customer
      try {
        const customer = await this.stripeService.createCustomer(organization);
        if (customer && customer.id) {
          result.stripeCustomerId = customer.id;
          this.logger.log(`Created new Stripe customer ${result.stripeCustomerId} for organization ${organization.id}`);
          return result;
        }
      } catch (customerError: any) {
        this.logger.error(
          `Failed to create Stripe customer for organization ${organization.id}:`,
          customerError,
        );
        throw customerError;
      }
      result.stripeCustomerId = null;
    }

    return result;
  }

  /**
   * Initiate payment flow: Payment-first approach
   * - Calculate pricing and proration
   * - Create payment order (Razorpay or Stripe)
   * - DO NOT create/update subscription
   * - DO NOT create invoice
   * - Subscription and invoice created only after payment succeeds
   */
  async initiatePayment(
    planId: string,
    billingCycle: BillingCycle,
    organizationId: string,
    paymentProvider: PaymentProvider, // Required - no default
    userCount?: number, // Optional: if not provided, use current org user count
  ): Promise<any> {
    try {
      // Fetch plan details
      const plan = await this.subscriptionPlanModel.findByPk(planId);
      if (!plan) {
        throw new NotFoundException(`Plan with ID ${planId} not found`);
      }

      // Verify organization exists
      const organization = await this.organizationModel.findByPk(organizationId);
      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      // Find existing subscription first (needed to determine base user count)
      const existingSubscription = await this.subscriptionModel.findOne({
        where: {
          organizationId,
          status: {
            [Op.in]: [
              SubscriptionStatus.TRIAL,
              SubscriptionStatus.ACTIVE,
            ],
          },
        },
        order: [['createdAt', 'DESC']],
        include: [{ model: SubscriptionPlan, as: 'plan' }],
      });

      // Determine actual user count: use provided userCount, or existing subscription's userCount, or count active users
      let actualUserCount = userCount;
      if (!actualUserCount) {
        // If userCount not provided, use existing subscription's userCount as base (if available)
        if (existingSubscription?.userCount) {
          actualUserCount = existingSubscription.userCount;
        } else {
          // No existing subscription or no userCount - count active users
          const currentUserCount = await User.count({
            where: {
              organizationId,
              status: UserStatus.ACTIVE,
            },
          });
          actualUserCount = Math.max(1, currentUserCount);
        }
      } else {
        actualUserCount = Math.max(1, actualUserCount);
      }

      let amount = 0;
      let pricingBreakdown: any = {};
      let prorationDetails: any = null;
      let operationType: 'TRIAL_TO_PAID' | 'UPGRADE' | 'ADD_USERS' | 'COMBINED' = 'TRIAL_TO_PAID';

      if (!existingSubscription || existingSubscription.status === SubscriptionStatus.TRIAL) {
        // Trial to Paid: Full period price (no proration)
        operationType = 'TRIAL_TO_PAID';
        
        // Calculate pricing for the selected user count (actualUserCount)
        const pricingResult = await this.pricingCalculationService.calculateSubscriptionPrice(
          planId,
          actualUserCount,
          billingCycle,
        );

        if (pricingResult.requiresContactSales) {
          throw new BadRequestException(
            `Organization has ${actualUserCount} users. Please contact sales for pricing.`,
          );
        }

        // Use the totalAmount from pricingResult (includes volume discount and all users)
        amount = pricingResult.totalAmount;

        pricingBreakdown = {
          basePricePerUser: pricingResult.basePricePerUser,
          volumeDiscountPercent: pricingResult.volumeDiscountPercent,
          discountedPricePerUser: pricingResult.discountedPricePerUser,
          totalAmount: pricingResult.totalAmount,
        };
        
        this.logger.log(
          `TRIAL_TO_PAID: Calculated amount $${amount} for ${actualUserCount} users on ${plan.name} (${billingCycle})`,
        );
      } else if (existingSubscription.status === SubscriptionStatus.ACTIVE) {
        // Check if this is an upgrade, user addition, billing cycle change, or combined
        // Use existing subscription's userCount (not default to 1) for accurate comparison
        const existingUserCount = existingSubscription.userCount || 1;
        const isPlanChange = existingSubscription.planId !== planId;
        const isUserIncrease = actualUserCount > existingUserCount;
        const isUserDecrease = actualUserCount < existingUserCount;
        const isBillingCycleChange = existingSubscription.billingCycle !== billingCycle;

        // User count reduction should use scheduling endpoint, not payment flow
        if (isUserDecrease && !isPlanChange) {
          throw new BadRequestException(
            `User count reduction detected. Please use the schedule-user-reduction endpoint. Reductions take effect at the next billing cycle with no credit.`,
          );
        }

        if (isPlanChange && isUserIncrease) {
          // Combined: Plan upgrade + user addition (may include billing cycle change)
          operationType = 'COMBINED';
          const oldPlan = existingSubscription.plan as SubscriptionPlan;
          const periodStart = existingSubscription.currentPeriodStart || new Date();
          const periodEnd = existingSubscription.currentPeriodEnd || new Date();
          const daysRemaining = this.prorationCalculationService.calculateDaysRemaining(
            periodStart,
            periodEnd,
          );
          const totalDays = this.prorationCalculationService.calculateTotalDaysInPeriod(
            periodStart,
            periodEnd,
          );

          // Check if billing cycle is changing
          const isBillingCycleChange = existingSubscription.billingCycle !== billingCycle;

          // Use actual subscription amount for credit calculation
          // Use existing subscription's userCount as base (not default to 1)
          const combinedResult = this.prorationCalculationService.calculateCombinedUpgradeCharge(
            oldPlan,
            plan,
            existingUserCount,
            actualUserCount,
            existingSubscription.billingCycle, // Old billing cycle for credit
            daysRemaining,
            totalDays,
            existingSubscription.finalAmount || existingSubscription.amount, // Pass actual paid amount
            isBillingCycleChange ? billingCycle : undefined, // New billing cycle for charge if changed
          );

          amount = combinedResult.totalCharge;
          prorationDetails = {
            daysRemaining,
            totalDays,
            proratedAmount: combinedResult.totalCharge,
            creditAmount: combinedResult.creditAmount,
            chargeAmount: combinedResult.chargeAmount,
            oldPlanName: oldPlan.name, // Add old plan name for display
            newPlanName: plan.name, // Add new plan name for display
          };

          const pricingResult = await this.pricingCalculationService.calculateSubscriptionPrice(
            planId,
            actualUserCount,
            billingCycle,
          );
          pricingBreakdown = {
            basePricePerUser: pricingResult.basePricePerUser,
            volumeDiscountPercent: pricingResult.volumeDiscountPercent,
            discountedPricePerUser: pricingResult.discountedPricePerUser,
            totalAmount: pricingResult.totalAmount,
          };
        } else if (isPlanChange) {
          // Plan upgrade only (may include billing cycle change)
          operationType = 'UPGRADE';
          const oldPlan = existingSubscription.plan as SubscriptionPlan;
          const periodStart = existingSubscription.currentPeriodStart || new Date();
          const periodEnd = existingSubscription.currentPeriodEnd || new Date();
          const daysRemaining = this.prorationCalculationService.calculateDaysRemaining(
            periodStart,
            periodEnd,
          );
          const totalDays = this.prorationCalculationService.calculateTotalDaysInPeriod(
            periodStart,
            periodEnd,
          );

          // Check if billing cycle is changing
          const isBillingCycleChange = existingSubscription.billingCycle !== billingCycle;

          // Use actual subscription amount (finalAmount) for credit calculation if available
          // This ensures we credit what was actually paid, accounting for previous user additions
          // Pass new billing cycle if it's different from old one
          // Use existing subscription's userCount as base (not default to 1)
          const upgradeResult = this.prorationCalculationService.calculatePlanUpgradeCharge(
            oldPlan,
            plan,
            existingUserCount,
            actualUserCount,
            existingSubscription.billingCycle, // Old billing cycle for credit
            daysRemaining,
            totalDays,
            existingSubscription.finalAmount || existingSubscription.amount, // Pass actual paid amount
            isBillingCycleChange ? billingCycle : undefined, // New billing cycle for charge if changed
          );

          amount = upgradeResult.netCharge;
          prorationDetails = {
            daysRemaining,
            totalDays,
            proratedAmount: upgradeResult.netCharge,
            creditAmount: upgradeResult.creditAmount,
            chargeAmount: upgradeResult.chargeAmount,
            oldPlanName: oldPlan.name, // Add old plan name for display
            newPlanName: plan.name, // Add new plan name for display
          };

          const pricingResult = await this.pricingCalculationService.calculateSubscriptionPrice(
            planId,
            actualUserCount,
            billingCycle,
          );
          pricingBreakdown = {
            basePricePerUser: pricingResult.basePricePerUser,
            volumeDiscountPercent: pricingResult.volumeDiscountPercent,
            discountedPricePerUser: pricingResult.discountedPricePerUser,
            totalAmount: pricingResult.totalAmount,
          };
        } else if (isUserIncrease) {
          // User addition only (may include billing cycle change)
          operationType = 'ADD_USERS';
          const oldPlan = existingSubscription.plan as SubscriptionPlan;
          const periodStart = existingSubscription.currentPeriodStart || new Date();
          const periodEnd = existingSubscription.currentPeriodEnd || new Date();

          // Check if billing cycle is changing
          const isBillingCycleChange = existingSubscription.billingCycle !== billingCycle;

          // Get old pricing (use old billing cycle)
          // Use existing subscription's userCount as base (not default to 1)
          const oldPricing = await this.pricingCalculationService.getCurrentSubscriptionPricing(
            oldPlan,
            existingUserCount,
            existingSubscription.billingCycle,
          );
          // Get new pricing (use new billing cycle if changed, otherwise use old)
          const newPricing = await this.pricingCalculationService.calculateSubscriptionPrice(
            planId,
            actualUserCount,
            isBillingCycleChange ? billingCycle : existingSubscription.billingCycle,
          );

          // Calculate days remaining
          const daysRemaining = this.prorationCalculationService.calculateDaysRemaining(
            periodStart,
            periodEnd,
          );
          const totalDays = this.prorationCalculationService.calculateTotalDaysInPeriod(
            periodStart,
            periodEnd,
          );

          // Use actual subscription amount paid for credit calculation (accounts for what was actually paid)
          const oldActualAmount = existingSubscription.finalAmount || existingSubscription.amount || oldPricing.totalAmount;
          
          // Credit: Prorated value of what was paid for old users (4 users) for remaining days
          const creditAmount = this.prorationCalculationService.calculateProratedAmount(
            oldActualAmount,
            daysRemaining,
            totalDays,
          );
          
          // Charge: Prorated value for all new users (5 users) for remaining days
          const chargeAmount = this.prorationCalculationService.calculateProratedAmount(
            newPricing.totalAmount,
            daysRemaining,
            totalDays,
          );
          
          // Net charge = Charge - Credit
          amount = chargeAmount - creditAmount;
          
          prorationDetails = {
            daysRemaining,
            totalDays,
            proratedAmount: amount,
            creditAmount: Math.round(creditAmount * 100) / 100,
            chargeAmount: Math.round(chargeAmount * 100) / 100,
            netCharge: Math.round(amount * 100) / 100,
            oldPlanName: oldPlan.name,
            newPlanName: oldPlan.name, // Same plan, just user addition
            oldBillingCycle: existingSubscription.billingCycle,
            newBillingCycle: isBillingCycleChange ? billingCycle : existingSubscription.billingCycle,
          };

          pricingBreakdown = {
            basePricePerUser: newPricing.basePricePerUser,
            volumeDiscountPercent: newPricing.volumeDiscountPercent,
            discountedPricePerUser: newPricing.discountedPricePerUser,
            totalAmount: newPricing.totalAmount,
          };
        } else if (isBillingCycleChange && !isPlanChange && !isUserIncrease) {
          // Billing cycle change only (no plan change, no user count change)
          operationType = 'UPGRADE'; // Use UPGRADE type for billing cycle change
          const oldPlan = existingSubscription.plan as SubscriptionPlan;
          const periodStart = existingSubscription.currentPeriodStart || new Date();
          const periodEnd = existingSubscription.currentPeriodEnd || new Date();
          const daysRemaining = this.prorationCalculationService.calculateDaysRemaining(
            periodStart,
            periodEnd,
          );
          const totalDays = this.prorationCalculationService.calculateTotalDaysInPeriod(
            periodStart,
            periodEnd,
          );

          // Calculate credit for old billing cycle and charge for new billing cycle
          // Use existing subscription's userCount as base (not default to 1)
          const upgradeResult = this.prorationCalculationService.calculatePlanUpgradeCharge(
            oldPlan,
            plan, // Same plan, different billing cycle
            existingUserCount,
            existingUserCount, // Same user count
            existingSubscription.billingCycle, // Old billing cycle for credit
            daysRemaining,
            totalDays,
            existingSubscription.finalAmount || existingSubscription.amount, // Pass actual paid amount
            billingCycle, // New billing cycle for charge
          );

          amount = upgradeResult.netCharge;
          prorationDetails = {
            daysRemaining,
            totalDays,
            proratedAmount: upgradeResult.netCharge,
            creditAmount: upgradeResult.creditAmount,
            chargeAmount: upgradeResult.chargeAmount,
            oldPlanName: oldPlan.name,
            newPlanName: plan.name,
            oldBillingCycle: existingSubscription.billingCycle,
            newBillingCycle: billingCycle,
          };

          const pricingResult = await this.pricingCalculationService.calculateSubscriptionPrice(
            planId,
            existingUserCount,
            billingCycle, // New billing cycle
          );
          pricingBreakdown = {
            basePricePerUser: pricingResult.basePricePerUser,
            volumeDiscountPercent: pricingResult.volumeDiscountPercent,
            discountedPricePerUser: pricingResult.discountedPricePerUser,
            totalAmount: pricingResult.totalAmount,
          };
        } else {
          throw new BadRequestException('No changes detected. Please select a different plan, change billing cycle, or increase user count.');
        }
      }

      if (amount <= 0) {
        throw new BadRequestException('Invalid payment amount calculated');
      }

      // Route to appropriate payment provider
      if (paymentProvider === PaymentProvider.STRIPE) {
        return await this.initiateStripePayment(
          organization,
          plan,
          billingCycle,
          amount,
          actualUserCount,
          pricingBreakdown,
          prorationDetails,
          operationType,
          planId,
          organizationId,
          existingSubscription,
        );
      } else {
        return await this.initiateRazorpayPayment(
          organization,
          plan,
          billingCycle,
          amount,
          actualUserCount,
          pricingBreakdown,
          prorationDetails,
          operationType,
          planId,
          organizationId,
          existingSubscription,
        );
      }
    } catch (error) {
      this.logger.error('Error initiating payment:', error);
      throw error;
    }
  }

  /**
   * Initiate Razorpay payment
   */
  private async initiateRazorpayPayment(
    organization: Organization,
    plan: SubscriptionPlan,
    billingCycle: BillingCycle,
    amount: number,
    actualUserCount: number,
    pricingBreakdown: any,
    prorationDetails: any,
    operationType: 'TRIAL_TO_PAID' | 'UPGRADE' | 'ADD_USERS' | 'COMBINED',
    planId: string,
    organizationId: string,
    existingSubscription?: Subscription | null,
  ): Promise<any> {
    // Get or create Razorpay customer
    const customerResult = await this.getOrCreatePaymentCustomer(
      organization,
      PaymentProvider.RAZORPAY,
      existingSubscription || undefined,
    );

    // Create Razorpay order
    const receiptId = `rcpt-${Date.now()}-${organizationId.substring(0, 8)}`;
    const order = await this.razorpayService.createOrder({
      amount: amount,
      currency: 'USD' as any,
      receipt: receiptId,
      planName: plan.name,
      planDescription: plan.description,
      billingCycle: billingCycle === BillingCycle.YEARLY ? 'Yearly' : 'Monthly',
      notes: {
        organizationId,
        planId,
        billingCycle,
        userCount: actualUserCount.toString(),
        operationType,
      },
    });

    this.logger.log(
      `Razorpay payment initiated for organization ${organizationId}, order ${order.id}, amount: $${amount}`,
    );

    // Get existing user count for display
    const existingUserCount = existingSubscription?.userCount || 0;
    const newUserCount = actualUserCount - existingUserCount;

    return {
      order: {
        id: order.id,
        amount: amount,
        currency: 'USD',
        receipt: order.receipt,
        planName: plan.name,
        planDescription: plan.description,
        billingCycle,
      },
      pricingBreakdown: {
        ...pricingBreakdown,
        prorationDetails,
      },
      pendingChanges: {
        planId,
        userCount: actualUserCount,
        billingCycle,
        operationType,
        existingSubscriptionId: existingSubscription?.id || null,
        existingUserCount,
        newUserCount,
      },
      paymentProvider: PaymentProvider.RAZORPAY,
    };
  }

  /**
   * Initiate Stripe payment (Checkout Session for one-time or Subscription for recurring)
   */
  private async initiateStripePayment(
    organization: Organization,
    plan: SubscriptionPlan,
    billingCycle: BillingCycle,
    amount: number,
    actualUserCount: number,
    pricingBreakdown: any,
    prorationDetails: any,
    operationType: 'TRIAL_TO_PAID' | 'UPGRADE' | 'ADD_USERS' | 'COMBINED',
    planId: string,
    organizationId: string,
    existingSubscription?: Subscription | null,
  ): Promise<any> {
    // Get or create Stripe customer
    const customerResult = await this.getOrCreatePaymentCustomer(
      organization,
      PaymentProvider.STRIPE,
      existingSubscription || undefined,
    );

    if (!customerResult.stripeCustomerId) {
      throw new BadRequestException('Failed to create Stripe customer');
    }

    const baseUrl = this.configService.get('APP_URL') || this.configService.get('BASE_URL') || 'http://localhost:3000';
    const frontendUrl = this.configService.get('FRONTEND_URL') || baseUrl.replace(':4000', ':3000');

    // Always use Checkout Session for Stripe
    // Use subscription mode for all operations (including upgrades) to create recurring subscription
    // For upgrades with proration, we'll add a credit note to the first invoice to charge only net amount
    // This ensures we have a subscription for the full plan amount, but charge net amount now
    const useSubscriptionMode = true; // Always use subscription mode for Stripe
    const interval = billingCycle === BillingCycle.YEARLY ? 'year' : 'month';
    // Always use full plan amount for subscription (proration credit will be applied to first invoice)
    const checkoutAmount = pricingBreakdown.totalAmount;

    // Include existingSubscriptionId in success URL to redirect back to detail page
    const subscriptionPath = existingSubscription?.id ? `/${existingSubscription.id}` : '';
    const successUrl = `${frontendUrl}/dashboard/subscriptions${subscriptionPath}?session_id={CHECKOUT_SESSION_ID}&success=true`;
    const cancelUrl = `${frontendUrl}/dashboard/subscriptions${subscriptionPath}?canceled=true`;

    const checkoutSession = await this.stripeService.createCheckoutSession({
      customerId: customerResult.stripeCustomerId,
      amount: checkoutAmount,
      currency: 'USD',
      successUrl,
      cancelUrl,
      mode: useSubscriptionMode ? 'subscription' : 'payment',
      interval: useSubscriptionMode ? interval : undefined,
      metadata: {
        organizationId,
        planId,
        planName: plan.name, // Include plan name to avoid database query in webhook
        billingCycle,
        userCount: actualUserCount.toString(),
        operationType,
        existingSubscriptionId: existingSubscription?.id || '',
        // Store pricing breakdown as JSON string in metadata (Stripe metadata values must be strings)
        pricingBreakdown: JSON.stringify({
          basePricePerUser: pricingBreakdown.basePricePerUser,
          volumeDiscountPercent: pricingBreakdown.volumeDiscountPercent,
          discountedPricePerUser: pricingBreakdown.discountedPricePerUser,
          totalAmount: pricingBreakdown.totalAmount,
          prorationDetails: prorationDetails || null,
        }),
      },
      description: useSubscriptionMode 
        ? `${plan.name} - ${billingCycle} subscription`
        : `${plan.name} - ${operationType}`,
    });

    this.logger.log(
      `Stripe checkout session created for organization ${organizationId}, session ${checkoutSession.id}, mode: ${useSubscriptionMode ? 'subscription' : 'payment'}, amount: $${checkoutAmount}`,
    );

    // Get existing user count for display
    const existingUserCount = existingSubscription?.userCount || 0;
    const newUserCount = actualUserCount - existingUserCount;

    return {
      checkoutSession: {
        id: checkoutSession.id,
        url: checkoutSession.url,
      },
      pricingBreakdown: {
        ...pricingBreakdown,
        prorationDetails,
      },
      pendingChanges: {
        planId,
        userCount: actualUserCount,
        billingCycle,
        operationType,
        existingSubscriptionId: existingSubscription?.id || null,
        existingUserCount,
        newUserCount,
      },
      paymentProvider: PaymentProvider.STRIPE,
    };
  }

  /**
   * Create Razorpay order with auto-filled plan data
   */
  async createRazorpayOrder(
    invoice: Invoice,
    plan: SubscriptionPlan,
    billingCycle: BillingCycle,
  ): Promise<any> {
    try {
      // Check if invoice amount is valid for Razorpay
      if (!invoice.total || invoice.total <= 0) {
        const errorMsg = `Cannot create Razorpay order for invoice ${invoice.id} with amount ${invoice.total}. Amount must be greater than 0.`;
        this.logger.error(errorMsg);
        throw new BadRequestException(errorMsg);
      }

      this.logger.log(
        `Creating Razorpay order for invoice ${invoice.id} with amount $${invoice.total}`,
      );

      // Generate a receipt ID that's max 40 characters (Razorpay requirement)
      // Format: inv-{shortened-invoice-id} or use timestamp-based receipt
      const receiptId = invoice.invoiceNumber 
        ? `inv-${invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30)}`
        : `rcpt-${Date.now()}`;

      const order = await this.razorpayService.createOrder({
        amount: invoice.total,
        currency: 'USD' as any,
        receipt: receiptId,
        planName: plan.name,
        planDescription: plan.description,
        billingCycle: billingCycle === BillingCycle.YEARLY ? 'Yearly' : 'Monthly',
        notes: {
          invoiceId: invoice.id,
          subscriptionId: invoice.subscriptionId,
          organizationId: invoice.organizationId,
        },
      });

      this.logger.log(`Successfully created Razorpay order ${order.id} for invoice ${invoice.id}`);
      return order;
    } catch (error) {
      this.logger.error('Error creating Razorpay order:', {
        invoiceId: invoice.id,
        invoiceTotal: invoice.total,
        error: error instanceof Error ? error.message : error,
        details: error,
      });
      throw error;
    }
  }

  /**
   * Process payment after verification - Create subscription and invoice ONLY after payment succeeds
   * Supports both Razorpay and Stripe
   */
  async processPayment(
    organizationId: string,
    orderId: string,
    paymentId: string,
    signature: string,
    pendingChanges: {
      planId: string;
      userCount: number;
      billingCycle: BillingCycle;
      operationType: 'TRIAL_TO_PAID' | 'UPGRADE' | 'ADD_USERS' | 'COMBINED';
      existingSubscriptionId?: string | null;
    },
    pricingBreakdown: {
      basePricePerUser: number;
      volumeDiscountPercent: number;
      discountedPricePerUser: number;
      totalAmount: number;
      prorationDetails?: any;
    },
    paymentProvider: PaymentProvider = PaymentProvider.RAZORPAY,
  ): Promise<{ subscriptionId: string; invoiceId: string }> {
    const sequelize = this.subscriptionModel.sequelize;
    if (!sequelize) {
      throw new Error('Sequelize instance not available');
    }

    // Use transaction to ensure atomic creation
    const transaction = await sequelize.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
    });

    try {
      // IDEMPOTENCY CHECK: Prevent duplicate processing of the same payment
      // Check if a subscription was already created very recently (within 2 minutes)
      // with the same plan, userCount, billingCycle, and organization
      // This prevents duplicate processing when webhooks are retried or called multiple times
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const recentSubscription = await this.subscriptionModel.findOne({
        where: {
          organizationId,
          planId: pendingChanges.planId,
          userCount: pendingChanges.userCount,
          billingCycle: pendingChanges.billingCycle,
          paymentProvider: paymentProvider,
          createdAt: {
            [Op.gte]: twoMinutesAgo,
          },
        },
        transaction,
        order: [['createdAt', 'DESC']],
      });

      if (recentSubscription) {
        this.logger.warn(
          `⚠️ Duplicate payment processing detected for orderId ${orderId} (${paymentProvider}). ` +
          `Subscription ${recentSubscription.id} was already created recently (${recentSubscription.createdAt}). ` +
          `Skipping to prevent duplicate subscription creation.`,
        );
        await transaction.rollback();
        
        // Find the most recent paid invoice for this subscription
        const existingInvoice = await Invoice.findOne({
          where: {
            subscriptionId: recentSubscription.id,
            status: InvoiceStatus.PAID,
          },
          transaction,
          order: [['createdAt', 'DESC']],
        });

        return {
          subscriptionId: recentSubscription.id,
          invoiceId: existingInvoice?.id || '',
        };
      }

      let amountPaid: number;
      let paymentDetails: any;

      if (paymentProvider === PaymentProvider.STRIPE) {
        // For Stripe, orderId is the checkout session ID
        // paymentId is the payment intent ID (or subscription ID as fallback)
        // Check if paymentId is a payment intent (starts with 'pi_') or subscription ID (starts with 'sub_')
        if (paymentId && paymentId.startsWith('pi_')) {
          // Valid payment intent ID - verify payment
          const paymentIntent = await this.stripeService.getPaymentIntent(paymentId);
          if (paymentIntent.status !== 'succeeded') {
            await transaction.rollback();
            throw new BadRequestException('Stripe payment not succeeded');
          }
          amountPaid = paymentIntent.amount / 100; // Convert from cents to dollars
          paymentDetails = paymentIntent;
        } else {
          // No payment intent ID or it's a subscription ID - get from checkout session
          const session = await this.stripeService.getCheckoutSession(orderId);
          if (session.payment_status !== 'paid') {
            await transaction.rollback();
            throw new BadRequestException('Stripe checkout session not paid');
          }
          amountPaid = (session.amount_total || 0) / 100; // Convert from cents to dollars
          paymentDetails = session;
          
          // For subscription mode, get the subscription ID from the session
          if (session.mode === 'subscription' && session.subscription) {
            const subscriptionId = typeof session.subscription === 'string' 
              ? session.subscription 
              : session.subscription.id;
            paymentDetails.subscription = subscriptionId;
            paymentDetails.customer = session.customer;
          }
          
          // If paymentId was provided but is a subscription ID, use it
          if (paymentId && paymentId.startsWith('sub_')) {
            paymentDetails.subscription = paymentId;
          }
        }
      } else {
        // Razorpay payment verification
        const isValid = this.razorpayService.verifyPaymentSignature({
          orderId,
          paymentId,
          signature,
        });

        if (!isValid) {
          await transaction.rollback();
          throw new BadRequestException('Invalid payment signature');
        }

        // Get payment details from Razorpay
        paymentDetails = await this.razorpayService.getPaymentDetails(paymentId);

        if (paymentDetails.status !== 'captured') {
          await transaction.rollback();
          throw new BadRequestException('Payment not captured');
        }

        amountPaid = paymentDetails.amount / 100; // Convert from cents to dollars
      }

      // Get plan details
      const plan = await this.subscriptionPlanModel.findByPk(pendingChanges.planId, {
        transaction,
      });
      if (!plan) {
        await transaction.rollback();
        throw new NotFoundException(`Plan with ID ${pendingChanges.planId} not found`);
      }

      // Get organization
      const organization = await this.organizationModel.findByPk(organizationId, {
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      if (!organization) {
        await transaction.rollback();
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      let subscription: Subscription;
      let oldSubscription: Subscription | null = null;

      if (pendingChanges.existingSubscriptionId) {
        // Get existing subscription with plan relation
        const existingSubscription = await this.subscriptionModel.findByPk(
          pendingChanges.existingSubscriptionId,
          {
            transaction,
            lock: Transaction.LOCK.UPDATE,
            include: [
              {
                model: this.subscriptionPlanModel,
                as: 'plan',
              },
            ],
          },
        );

        if (!existingSubscription) {
          await transaction.rollback();
          throw new NotFoundException(
            `Existing subscription ${pendingChanges.existingSubscriptionId} not found`,
          );
        }

        // Store old subscription details for invoice
        oldSubscription = existingSubscription as Subscription;

        // Cancel the old subscription in Stripe if it exists (for Stripe subscriptions)
        if (paymentProvider === PaymentProvider.STRIPE && existingSubscription.stripeSubscriptionId) {
          try {
            await this.stripeService.cancelSubscription(existingSubscription.stripeSubscriptionId, true); // Cancel immediately
            this.logger.log(
              `Cancelled Stripe subscription ${existingSubscription.stripeSubscriptionId} for old subscription ${existingSubscription.id}`,
            );
          } catch (stripeCancelError) {
            // Log error but don't fail - subscription might already be cancelled
            this.logger.warn(
              `Failed to cancel Stripe subscription ${existingSubscription.stripeSubscriptionId}:`,
              stripeCancelError,
            );
          }
        }

        // Cancel the old subscription in database to track history
        await this.subscriptionModel.update(
          {
            status: SubscriptionStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelReason: `Upgraded to new subscription - Plan: ${plan.name}, Users: ${pendingChanges.userCount}`,
          },
          { where: { id: existingSubscription.id }, transaction },
        );

        this.logger.log(
          `Cancelled old subscription ${existingSubscription.id} for organization ${organizationId}`,
        );
      }

      // Get or create payment customer ID based on payment provider
      const customerResult = await this.getOrCreatePaymentCustomer(
        organization,
        paymentProvider,
        oldSubscription || undefined,
      );
      const razorpayCustomerId = customerResult.razorpayCustomerId;
      const stripeCustomerId = customerResult.stripeCustomerId;

      // Always create a new subscription row to track history
      const periodEnd = this.periodCalculationService.calculatePeriodEnd(
        new Date(),
        pendingChanges.billingCycle,
      );
      
      // Calculate base amount (before volume discount)
      // basePricePerUser already includes yearly "10 months pay" discount if applicable
      const baseAmount = pricingBreakdown.basePricePerUser * pendingChanges.userCount;
      
      // Store proration details (credits/adjustments) if available
      const prorationDetailsToStore = pricingBreakdown.prorationDetails ? {
        creditAmount: pricingBreakdown.prorationDetails.creditAmount || 0,
        chargeAmount: pricingBreakdown.prorationDetails.chargeAmount || 0,
        netCharge: pricingBreakdown.prorationDetails.proratedAmount || 0,
        daysRemaining: pricingBreakdown.prorationDetails.daysRemaining,
        totalDays: pricingBreakdown.prorationDetails.totalDays,
        oldPlanName: pricingBreakdown.prorationDetails.oldPlanName,
        newPlanName: pricingBreakdown.prorationDetails.newPlanName,
        oldBillingCycle: pricingBreakdown.prorationDetails.oldBillingCycle,
        newBillingCycle: pricingBreakdown.prorationDetails.newBillingCycle,
      } : null;
      
      // Ensure userCount is set correctly - use pendingChanges.userCount (which should be total: existing + new)
      // If not provided, use existing subscription's userCount or default to 1
      const subscriptionUserCount = pendingChanges.userCount && pendingChanges.userCount > 0 
        ? pendingChanges.userCount 
        : (oldSubscription?.userCount || 1);

      const subscriptionData = {
        organizationId,
        planId: pendingChanges.planId,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: pendingChanges.billingCycle,
        amount: baseAmount, // Base amount before volume discount
        currency: 'USD' as any,
        userCount: subscriptionUserCount, // Ensure userCount is always set correctly
        volumeDiscountPercent: pricingBreakdown.volumeDiscountPercent,
        finalAmount: pricingBreakdown.totalAmount, // Final amount after all discounts
        prorationDetails: prorationDetailsToStore, // Store credit/adjustment details
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        paymentProvider: paymentProvider,
        // Set payment customer IDs (from old subscription or newly created)
        razorpayCustomerId: paymentProvider === PaymentProvider.RAZORPAY ? razorpayCustomerId : null,
        stripeCustomerId: paymentProvider === PaymentProvider.STRIPE ? (paymentDetails?.customer || customerResult.stripeCustomerId || null) : null,
        // Set subscription IDs
        razorpaySubscriptionId: paymentProvider === PaymentProvider.RAZORPAY ? orderId : null,
        stripeSubscriptionId: paymentProvider === PaymentProvider.STRIPE ? (paymentDetails?.subscription || null) : null,
      };

      subscription = await this.subscriptionModel.create(subscriptionData as any, {
        transaction,
      });

      this.logger.log(
        `Created new subscription ${subscription.id} for organization ${organizationId}${oldSubscription ? ` (replacing ${oldSubscription.id})` : ''}`,
      );

      // Generate detailed invoice AFTER subscription is created/updated
      // Pass old subscription details for invoice breakdown
      const invoice = await this.invoiceGenerationService.generateDetailedSubscriptionInvoice(
        organizationId,
        subscription.id,
        plan,
        pendingChanges.billingCycle,
        pendingChanges.userCount,
        pricingBreakdown,
        {
          paymentId,
          orderId,
          amountPaid,
        },
        oldSubscription ? {
          oldPlanId: oldSubscription.planId,
          oldPlanName: (oldSubscription.plan as SubscriptionPlan)?.name || 'Previous Plan',
          oldUserCount: oldSubscription.userCount || 1,
          oldBillingCycle: oldSubscription.billingCycle,
          oldAmount: oldSubscription.finalAmount || oldSubscription.amount || 0,
        } : undefined,
        transaction,
      );

      // Commit transaction
      await transaction.commit();
      this.logger.log(
        `Payment processed successfully: Subscription ${subscription.id} created/updated and Invoice ${invoice.id} created as PAID`,
      );

      // Clear quota cache for the organization to reflect new plan limits
      // This ensures users get the correct daily email limit immediately after upgrade
      await this.quotaManagementService.clearCache(undefined, organizationId);
      this.logger.debug(`Cleared quota cache for organization ${organizationId} after subscription upgrade`);

      return {
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
      };
    } catch (error) {
      // Rollback transaction on error
      if (transaction) {
        try {
          await transaction.rollback();
          this.logger.debug('Transaction rolled back due to payment processing error');
        } catch (rollbackError) {
          this.logger.warn('Transaction rollback failed (may already be finished):', rollbackError);
        }
      }

      this.logger.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Activate subscription after payment
   */
  async activateSubscription(subscriptionId: string): Promise<void> {
    try {
      const subscription = await this.subscriptionModel.findByPk(subscriptionId);
      if (!subscription) {
        throw new NotFoundException(`Subscription with ID ${subscriptionId} not found`);
      }

      await this.subscriptionModel.update(
        {
          status: SubscriptionStatus.ACTIVE,
        },
        { where: { id: subscriptionId } },
      );

      this.logger.log(`Subscription ${subscriptionId} activated`);
    } catch (error) {
      this.logger.error(`Error activating subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Renew subscription for next period
   */
  async renewSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.subscriptionRenewalService.processAutoRenewal(subscriptionId);
    } catch (error) {
      this.logger.error(`Error renewing subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Handle payment failure - Restore previous subscription state or delete if new subscription
   */
  async handlePaymentFailure(invoiceId: string): Promise<void> {
    const sequelize = this.subscriptionModel.sequelize;
    if (!sequelize) {
      throw new Error('Sequelize instance not available');
    }

    // Use transaction to ensure atomic rollback
    const transaction = await sequelize.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
    });

    try {
      // Find invoice with subscription
      const invoice = await this.invoiceModel.findByPk(invoiceId, {
        include: [{ model: Subscription, as: 'subscription' }],
        transaction,
      });

      if (!invoice) {
        await transaction.rollback();
        this.logger.warn(`Invoice ${invoiceId} not found for payment failure handling`);
        return;
      }

      const subscriptionId = invoice.subscriptionId;

      // Delete invoice
      await this.invoiceModel.destroy({
        where: { id: invoiceId },
        transaction,
      });

      // Handle subscription rollback
      if (subscriptionId) {
        const subscription = await this.subscriptionModel.findByPk(subscriptionId, {
          transaction,
          lock: Transaction.LOCK.UPDATE,
        });

        if (subscription && subscription.status === SubscriptionStatus.INCOMPLETE) {
          // Check if this was an upgrade (existing subscription was updated)
          // We need to check if there's a previous subscription state to restore
          // Since we can't store it in the subscription model, we'll check the subscription history
          // For now, we'll check if subscription was created recently (within last hour) vs updated
          const subscriptionAge = Date.now() - new Date(subscription.createdAt).getTime();
          const isNewSubscription = subscriptionAge < 3600000; // Less than 1 hour old

          if (isNewSubscription) {
            // This is a new subscription, delete it
            await this.subscriptionModel.destroy({
              where: { id: subscriptionId },
              transaction,
            });
            this.logger.log(`Deleted new INCOMPLETE subscription ${subscriptionId} due to payment failure`);
          } else {
            // This was an upgrade - we need to restore previous state
            // Since we can't easily track previous state, we'll keep it as INCOMPLETE
            // but log a warning. In production, you might want to use a subscription_history table
            this.logger.warn(
              `Subscription ${subscriptionId} was updated but payment failed. ` +
              `Subscription remains INCOMPLETE. Manual intervention may be required.`,
            );
            
            // Optionally, you could set a flag or create a notification for admin review
            // For now, we'll leave it as INCOMPLETE so the user can retry payment
          }
        }
      }

      // Commit transaction
      await transaction.commit();
      this.logger.log(
        `Payment failure handled: Invoice ${invoiceId} deleted, subscription ${subscriptionId} handled`,
      );
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Error handling payment failure for invoice ${invoiceId}:`, error);
      throw error;
    }
  }

}

