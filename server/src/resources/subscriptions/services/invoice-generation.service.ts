import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import moment from 'moment-timezone';
import { Transaction } from 'sequelize';
import { InjectModel } from '@nestjs/sequelize';
import { InvoicesService } from '../invoices.service';
import { Invoice, InvoiceStatus, Currency } from '../entities/invoice.entity';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { BillingCycle } from '../entities/subscription.entity';
@Injectable()
export class InvoiceGenerationService {
  private readonly logger = new Logger(InvoiceGenerationService.name);

  constructor(
    private readonly invoicesService: InvoicesService,
    @InjectModel(Subscription)
    private readonly subscriptionModel: typeof Subscription,
    @InjectModel(SubscriptionPlan)
    private readonly subscriptionPlanModel: typeof SubscriptionPlan,
    @InjectModel(Organization)
    private readonly organizationModel: typeof Organization,
    @InjectModel(Invoice)
    private readonly invoiceModel: typeof Invoice,
  ) {}

  /**
   * Generate a $0 invoice for trial subscription when organization is created
   */
  async generateTrialInvoice(
    organizationId: string,
    subscriptionId: string,
    transaction?: Transaction,
  ): Promise<Invoice> {
    try {
      const subscription = await this.subscriptionModel.findByPk(subscriptionId, {
        include: [{ model: SubscriptionPlan, as: 'plan' }],
        transaction,
      });

      if (!subscription) {
        throw new NotFoundException(`Subscription with ID ${subscriptionId} not found`);
      }

      const invoiceNumber = await this.invoicesService.generateInvoiceNumber(transaction);
      const now = moment();
      const issueDate = moment(now);
      const dueDate = moment(subscription.trialEnd || subscription.currentPeriodEnd || now);

      const invoice = await this.invoicesService.createInvoice({
        organizationId,
        subscriptionId,
        invoiceNumber,
        status: InvoiceStatus.PAID, // $0 invoice is automatically paid
        subtotal: 0,
        taxAmount: 0,
        total: 0,
        amountPaid: 0,
        amountDue: 0,
        currency: Currency.USD,
        issueDate: issueDate.format('YYYY-MM-DD'),
        dueDate: dueDate.format('YYYY-MM-DD'),
        paidAt: now.toISOString(), // Mark as paid immediately for $0 invoice
      }, transaction);

      this.logger.log(
        `Generated trial invoice ${invoiceNumber} ($0) for organization ${organizationId}`,
      );

      return invoice;
    } catch (error) {
      this.logger.error(
        `Failed to generate trial invoice for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Generate invoice for subscription (monthly or yearly)
   */
  async generateSubscriptionInvoice(
    subscriptionId: string,
    plan?: SubscriptionPlan,
    billingCycle?: BillingCycle,
    transaction?: any,
  ): Promise<Invoice> {
    try {
      const subscription = await this.subscriptionModel.findByPk(subscriptionId, {
        include: [
          { model: SubscriptionPlan, as: 'plan' },
          { model: Organization, as: 'organization' },
        ],
      });

      if (!subscription) {
        throw new NotFoundException(`Subscription with ID ${subscriptionId} not found`);
      }

      const planData = plan || subscription.plan;
      const cycle = billingCycle || subscription.billingCycle;

      if (!planData) {
        throw new NotFoundException('Subscription plan not found');
      }

      // Use subscription's finalAmount if available (includes user count and volume discount)
      // Otherwise calculate from plan pricing
      let amount = subscription.finalAmount || 0;
      
      if (amount === 0) {
        // Fallback to plan pricing (legacy support)
        const userCount = subscription.userCount || 1;
        const pricePerUser =
        cycle === BillingCycle.YEARLY
            ? planData.pricePerUserYearly || 0
            : planData.pricePerUserMonthly || 0;
        amount = pricePerUser * userCount;
      }

      const invoiceNumber = await this.invoicesService.generateInvoiceNumber(transaction);
      const now = moment();
      const issueDate = moment(now);
      const dueDate = moment(now).add(7, 'days'); // 7 days from issue date

      const invoice = await this.invoicesService.createInvoice(
        {
          organizationId: subscription.organizationId,
          subscriptionId,
          invoiceNumber,
          status: InvoiceStatus.OPEN,
          subtotal: amount,
          taxAmount: 0,
          total: amount,
          amountPaid: 0,
          amountDue: amount,
          currency: Currency.USD,
          issueDate: issueDate.format('YYYY-MM-DD'),
          dueDate: dueDate.format('YYYY-MM-DD'),
        },
        transaction, // Pass transaction to invoice creation
      );

      this.logger.log(
        `Generated subscription invoice ${invoiceNumber} ($${amount}) for subscription ${subscriptionId}`,
      );

      return invoice;
    } catch (error) {
      this.logger.error(
        `Failed to generate subscription invoice for subscription ${subscriptionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Generate renewal invoice before subscription expiry
   */
  async generateRenewalInvoice(
    subscriptionId: string,
    transaction?: Transaction,
    stripeInvoiceData?: {
      stripeInvoiceId?: string;
      amountPaid?: number;
      total?: number;
      subtotal?: number;
      tax?: number;
      currency?: string;
      paidAt?: Date;
      invoiceDate?: Date;
      dueDate?: Date;
      invoiceUrl?: string | null;
      invoicePdf?: string | null;
    },
  ): Promise<Invoice> {
    try {
      const subscription = await this.subscriptionModel.findByPk(subscriptionId, {
        include: [
          { model: SubscriptionPlan, as: 'plan' },
          { model: Organization, as: 'organization' },
        ],
        transaction,
      });

      if (!subscription) {
        throw new NotFoundException(`Subscription with ID ${subscriptionId} not found`);
      }

      if (!subscription.plan) {
        throw new NotFoundException('Subscription plan not found');
      }

      // Use Stripe invoice data if provided, otherwise calculate from subscription
      let amount = stripeInvoiceData?.total || 0;
      let subtotal = stripeInvoiceData?.subtotal || 0;
      let taxAmount = stripeInvoiceData?.tax || 0;
      
      if (amount === 0) {
        // Use subscription's finalAmount if available (includes user count and volume discount)
        amount = subscription.finalAmount || 0;
        
        if (amount === 0) {
          // Fallback to plan pricing (legacy support)
          const userCount = subscription.userCount || 1;
          const pricePerUser =
          subscription.billingCycle === BillingCycle.YEARLY
              ? subscription.plan.pricePerUserYearly || 0
              : subscription.plan.pricePerUserMonthly || 0;
          amount = pricePerUser * userCount;
        }
        subtotal = amount;
      }

      const invoiceNumber = await this.invoicesService.generateInvoiceNumber(transaction);
      const now = moment();
      
      // Use Stripe invoice dates if provided, otherwise calculate
      const issueDate = stripeInvoiceData?.invoiceDate 
        ? moment(stripeInvoiceData.invoiceDate)
        : moment(now);
      const dueDate = stripeInvoiceData?.dueDate
        ? moment(stripeInvoiceData.dueDate)
        : moment(subscription.currentPeriodEnd || now).add(7, 'days');
      
      // If Stripe invoice data provided, invoice is already paid
      const isPaid = !!stripeInvoiceData?.stripeInvoiceId;
      const amountPaid = stripeInvoiceData?.amountPaid || (isPaid ? amount : 0);
      const amountDue = isPaid ? 0 : amount;

      const invoice = await this.invoicesService.createInvoice({
        organizationId: subscription.organizationId,
        subscriptionId,
        invoiceNumber,
        status: isPaid ? InvoiceStatus.PAID : InvoiceStatus.OPEN,
        subtotal,
        taxAmount,
        total: amount,
        amountPaid,
        amountDue,
        currency: (stripeInvoiceData?.currency as Currency) || Currency.USD,
        issueDate: issueDate.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        paidAt: stripeInvoiceData?.paidAt ? stripeInvoiceData.paidAt.toISOString() : (isPaid ? now.toISOString() : null),
        stripeInvoiceId: stripeInvoiceData?.stripeInvoiceId || null,
        pdfUrl: stripeInvoiceData?.invoicePdf || null,
      }, transaction);

      this.logger.log(
        `Generated renewal invoice ${invoiceNumber} ($${amount}${stripeInvoiceData?.stripeInvoiceId ? `, Stripe: ${stripeInvoiceData.stripeInvoiceId}` : ''}) for subscription ${subscriptionId}`,
      );

      return invoice;
    } catch (error) {
      this.logger.error(
        `Failed to generate renewal invoice for subscription ${subscriptionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Generate prorated invoice for user added mid-cycle
   */
  async generateProratedInvoice(
    organizationId: string,
    subscriptionId: string,
    amount: number,
    description: string,
    transaction?: Transaction,
  ): Promise<Invoice> {
    try {
      const invoiceNumber = await this.invoicesService.generateInvoiceNumber(transaction);
      const now = moment();

      const invoice = await this.invoicesService.createInvoice(
        {
          organizationId,
          subscriptionId,
          invoiceNumber,
          status: InvoiceStatus.OPEN,
          subtotal: amount,
          taxAmount: 0,
          total: amount,
          amountPaid: 0,
          amountDue: amount,
          currency: Currency.USD,
          issueDate: now.format('YYYY-MM-DD'),
          dueDate: moment(now).add(7, 'days').format('YYYY-MM-DD'), // 7 days from now
        },
        transaction,
      );

      this.logger.log(
        `Generated prorated invoice ${invoiceNumber} ($${amount}) for subscription ${subscriptionId}: ${description}`,
      );

      return invoice;
    } catch (error) {
      this.logger.error(
        `Failed to generate prorated invoice for subscription ${subscriptionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Generate invoice for plan upgrade
   */
  async generateUpgradeInvoice(
    organizationId: string,
    subscriptionId: string,
    amount: number,
    oldPlan: string,
    newPlan: string,
    transaction?: Transaction,
  ): Promise<Invoice> {
    try {
      const invoiceNumber = await this.invoicesService.generateInvoiceNumber(transaction);
      const now = moment();

      const invoice = await this.invoicesService.createInvoice(
        {
          organizationId,
          subscriptionId,
          invoiceNumber,
          status: InvoiceStatus.OPEN,
          subtotal: amount,
          taxAmount: 0,
          total: amount,
          amountPaid: 0,
          amountDue: amount,
          currency: Currency.USD,
          issueDate: now.format('YYYY-MM-DD'),
          dueDate: moment(now).add(7, 'days').format('YYYY-MM-DD'),
        },
        transaction,
      );

      this.logger.log(
        `Generated upgrade invoice ${invoiceNumber} ($${amount}) for subscription ${subscriptionId}: ${oldPlan} → ${newPlan}`,
      );

      return invoice;
    } catch (error) {
      this.logger.error(
        `Failed to generate upgrade invoice for subscription ${subscriptionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Generate credit note for plan downgrade (though no credit is given per requirements)
   * This method exists for consistency but returns null
   */
  async generateDowngradeCredit(
    organizationId: string,
    subscriptionId: string,
    amount: number,
    oldPlan: string,
    newPlan: string,
    transaction?: Transaction,
  ): Promise<Invoice | null> {
    // Per requirements: No credit for downgrade
    // This method exists for API consistency but does not generate credit
    this.logger.log(
      `Downgrade from ${oldPlan} to ${newPlan} for subscription ${subscriptionId}. No credit given per policy.`,
    );
    return null;
  }

  /**
   * Generate credit note for cancellation (though no credit is given per requirements)
   * This method exists for consistency but returns null
   */
  async generateCancellationCredit(
    organizationId: string,
    subscriptionId: string,
    amount: number,
    reason: string,
    transaction?: Transaction,
  ): Promise<Invoice | null> {
    // Per requirements: No credit for cancellation, user keeps access until period end
    // This method exists for API consistency but does not generate credit
    this.logger.log(
      `Cancellation for subscription ${subscriptionId}. No credit given per policy. User keeps access until period end.`,
    );
    return null;
  }

  /**
   * Generate detailed subscription invoice with complete breakdown
   * Called AFTER payment succeeds
   */
  async generateDetailedSubscriptionInvoice(
    organizationId: string,
    subscriptionId: string,
    plan: SubscriptionPlan,
    billingCycle: BillingCycle,
    userCount: number,
    pricingBreakdown: {
      basePricePerUser: number;
      volumeDiscountPercent: number;
      discountedPricePerUser: number;
      totalAmount: number;
      prorationDetails?: {
        daysRemaining: number;
        totalDays: number;
        proratedAmount: number;
        creditAmount?: number;
        chargeAmount?: number;
        oldPlanName?: string;
        newPlanName?: string;
      };
    },
    paymentDetails: {
      paymentId: string;
      orderId: string;
      amountPaid: number;
    },
    oldSubscriptionDetails?: {
      oldPlanId: string;
      oldPlanName: string;
      oldUserCount: number;
      oldBillingCycle: BillingCycle;
      oldAmount: number;
    },
    transaction?: Transaction,
  ): Promise<Invoice> {
    try {
      const invoiceNumber = await this.invoicesService.generateInvoiceNumber(transaction);
      const now = moment();

      // Normalize numeric values to ensure they are numbers (defensive check)
      const basePricePerUser = typeof pricingBreakdown.basePricePerUser === 'number' 
        ? pricingBreakdown.basePricePerUser 
        : parseFloat(String(pricingBreakdown.basePricePerUser || 0));
      const totalAmount = typeof pricingBreakdown.totalAmount === 'number'
        ? pricingBreakdown.totalAmount
        : parseFloat(String(pricingBreakdown.totalAmount || 0));
      const volumeDiscountPercent = typeof pricingBreakdown.volumeDiscountPercent === 'number'
        ? pricingBreakdown.volumeDiscountPercent
        : parseFloat(String(pricingBreakdown.volumeDiscountPercent || 0));
      const discountedPricePerUser = typeof pricingBreakdown.discountedPricePerUser === 'number'
        ? pricingBreakdown.discountedPricePerUser
        : parseFloat(String(pricingBreakdown.discountedPricePerUser || 0));

      // Validate normalized values
      if (isNaN(basePricePerUser) || isNaN(totalAmount)) {
        throw new Error(`Invalid pricing breakdown: basePricePerUser=${pricingBreakdown.basePricePerUser}, totalAmount=${pricingBreakdown.totalAmount}`);
      }

      // Calculate subtotal (base price × users)
      const subtotal = basePricePerUser * userCount;

      // Calculate volume discount amount
      const volumeDiscountAmount = subtotal - totalAmount;

      // Calculate final amount (with proration if applicable)
      let finalAmount = totalAmount;
      if (pricingBreakdown.prorationDetails) {
        // For prorated charges, use the prorated amount
        const chargeAmount = pricingBreakdown.prorationDetails.chargeAmount;
        const proratedAmount = pricingBreakdown.prorationDetails.proratedAmount;
        finalAmount = typeof chargeAmount === 'number' ? chargeAmount : 
                     (typeof proratedAmount === 'number' ? proratedAmount : totalAmount);
      }

      // Build detailed line items
      const lineItems = [
        {
          description: `Subscription: ${plan.name} - ${userCount} user${userCount !== 1 ? 's' : ''}`,
          quantity: 1,
          unitPrice: 0,
          total: 0,
        },
      ];

      // Add old subscription details if this is an upgrade
      if (oldSubscriptionDetails) {
        lineItems.push({
          description: `Previous Subscription: ${oldSubscriptionDetails.oldPlanName} - ${oldSubscriptionDetails.oldUserCount} user${oldSubscriptionDetails.oldUserCount !== 1 ? 's' : ''}`,
          quantity: 1,
          unitPrice: 0,
          total: 0,
        });
      }

      lineItems.push({
        description: `Base Price: $${basePricePerUser.toFixed(2)}/user × ${userCount} users`,
        quantity: userCount,
        unitPrice: basePricePerUser,
        total: subtotal,
      });

      if (volumeDiscountPercent > 0) {
        lineItems.push({
          description: `Volume Discount: ${volumeDiscountPercent}%`,
          quantity: 1,
          unitPrice: 0,
          total: -volumeDiscountAmount,
        });
      }

      if (pricingBreakdown.prorationDetails) {
        const proration = pricingBreakdown.prorationDetails;
        const daysRemaining = typeof proration.daysRemaining === 'number' ? proration.daysRemaining : parseFloat(String(proration.daysRemaining || 0));
        const totalDays = typeof proration.totalDays === 'number' ? proration.totalDays : parseFloat(String(proration.totalDays || 0));
        lineItems.push({
          description: `Proration: ${daysRemaining}/${totalDays} days of billing period`,
          quantity: 1,
          unitPrice: 0,
          total: proration.proratedAmount,
        });

        if (proration.creditAmount && proration.creditAmount > 0) {
          const oldPlanName = proration.oldPlanName || oldSubscriptionDetails?.oldPlanName || 'Previous Plan';
          lineItems.push({
            description: `Credit from ${oldPlanName} (${oldSubscriptionDetails?.oldUserCount || 'previous'} user${(oldSubscriptionDetails?.oldUserCount || 1) !== 1 ? 's' : ''})`,
            quantity: 1,
            unitPrice: 0,
            total: -proration.creditAmount,
          });
        }

        if (proration.chargeAmount && proration.chargeAmount > 0 && proration.creditAmount) {
          const newPlanName = proration.newPlanName || plan.name;
          lineItems.push({
            description: `Charge for ${newPlanName} (${userCount} user${userCount !== 1 ? 's' : ''})`,
            quantity: 1,
            unitPrice: 0,
            total: proration.chargeAmount,
          });
        }
      }

      // Store detailed breakdown in billingAddress JSON field
      const invoiceDetails = {
        plan: {
          id: plan.id,
          name: plan.name,
          description: plan.description,
        },
        billingCycle,
        userCount,
        lineItems,
        subtotal,
        volumeDiscount: {
          percent: volumeDiscountPercent,
          amount: volumeDiscountAmount,
        },
        proration: pricingBreakdown.prorationDetails || null,
        oldSubscription: oldSubscriptionDetails ? {
          planId: oldSubscriptionDetails.oldPlanId,
          planName: oldSubscriptionDetails.oldPlanName,
          userCount: oldSubscriptionDetails.oldUserCount,
          billingCycle: oldSubscriptionDetails.oldBillingCycle,
          amount: oldSubscriptionDetails.oldAmount,
        } : null,
        tax: 0,
        total: finalAmount,
      };

      // Create invoice with base fields
      const invoice = await this.invoicesService.createInvoice(
        {
          organizationId,
          subscriptionId,
          invoiceNumber,
          status: InvoiceStatus.PAID, // Already paid since payment succeeded
          subtotal: finalAmount,
          taxAmount: 0,
          total: finalAmount,
          amountPaid: paymentDetails.amountPaid,
          amountDue: 0,
          currency: Currency.USD,
          issueDate: now.format('YYYY-MM-DD'),
          dueDate: now.format('YYYY-MM-DD'), // Due date same as issue date for paid invoices
          paidAt: now.toISOString(),
          billingAddress: invoiceDetails, // Store detailed breakdown here
        } as any,
        transaction,
      );

      // Update invoice with Razorpay payment details (fields not in DTO) - update directly on model
      await this.invoiceModel.update(
        {
          razorpayPaymentId: paymentDetails.paymentId,
          razorpayOrderId: paymentDetails.orderId,
          paymentStatus: 'SUCCESS',
        },
        {
          where: { id: invoice.id },
          transaction,
        },
      );

      this.logger.log(
        `Generated detailed invoice ${invoiceNumber} ($${finalAmount}) for subscription ${subscriptionId} with complete breakdown`,
      );

      return invoice;
    } catch (error) {
      this.logger.error(
        `Failed to generate detailed invoice for subscription ${subscriptionId}:`,
        error,
      );
      throw error;
    }
  }
}

