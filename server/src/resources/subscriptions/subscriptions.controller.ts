import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPlansService } from './subscription-plans.service';
import { InvoicesService } from './invoices.service';
import { SubscriptionPaymentService } from './services/subscription-payment.service';
import { PricingCalculationService } from './services/pricing-calculation.service';
import { ProrationCalculationService } from './services/proration-calculation.service';
import { TrialManagementService } from './services/trial-management.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionQueryDto, SubscriptionPlanQueryDto, InvoiceQueryDto } from './dto/query.dto';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { BillingCycle } from './entities/subscription.entity';
import { InvoiceStatus } from './entities/invoice.entity';
import { VerifyPaymentDto } from 'src/resources/payments/dto/verify-payment.dto';
import { PaymentProvider } from 'src/common/enums/payment-provider.enum';
import { StripeService } from 'src/resources/payments/stripe.service';

@Controller()
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly subscriptionPlansService: SubscriptionPlansService,
    private readonly invoicesService: InvoicesService,
    private readonly subscriptionPaymentService: SubscriptionPaymentService,
    private readonly pricingCalculationService: PricingCalculationService,
    private readonly prorationCalculationService: ProrationCalculationService,
    private readonly trialManagementService: TrialManagementService,
    private readonly stripeService: StripeService,
  ) {}

  // ===== SUBSCRIPTION PLANS ROUTES (/subscriptions/plans/*) =====
  @Post('plans')
  createPlan(@Body() createSubscriptionPlanDto: CreateSubscriptionPlanDto) {
    return this.subscriptionPlansService.createSubscriptionPlan(
      createSubscriptionPlanDto,
    );
  }

  @Get('plans')
  findAllPlans(@Query() query: SubscriptionPlanQueryDto) {
    return this.subscriptionPlansService.findAll(query);
  }

  @Get('plans/active-public')
  findActivePublicPlans() {
    return this.subscriptionPlansService.getActivePublicPlans();
  }

  @Get('plans/:id')
  findPlanById(@Param('id') id: string) {
    return this.subscriptionPlansService.findSubscriptionPlanById(id);
  }

  @Patch('plans/:id')
  updatePlan(
    @Param('id') id: string,
    @Body() updateSubscriptionPlanDto: UpdateSubscriptionPlanDto,
  ) {
    return this.subscriptionPlansService.updateSubscriptionPlan(
      id,
      updateSubscriptionPlanDto,
    );
  }

  @Delete('plans/:id')
  removePlan(@Param('id') id: string) {
    return this.subscriptionPlansService.removeSubscriptionPlan(id);
  }

  @Delete('plans/:id/force')
  forceDeletePlan(@Param('id') id: string) {
    return this.subscriptionPlansService.permanentlyDeleteSubscriptionPlan(id);
  }

  @Post('plans/:id/restore')
  restorePlan(@Param('id') id: string) {
    return this.subscriptionPlansService.restoreSubscriptionPlan(id);
  }

  // ===== SUBSCRIPTIONS ROUTES (/subscriptions/subscriptions/*) =====
  @Post()
  create(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionsService.createSubscription(createSubscriptionDto);
  }

  @Get()
  findAll(@Query() query: SubscriptionQueryDto) {
    return this.subscriptionsService.findAll(query);
  }

  @Get('organization/:organizationId/active')
  findActiveByOrganization(@Param('organizationId') organizationId: string) {
    return this.subscriptionsService.findActiveSubscriptionByOrganizationId(
      organizationId,
    );
  }

  @Get('organization/:organizationId/trial-status')
  async getTrialStatus(@Param('organizationId') organizationId: string) {
    return this.trialManagementService.checkTrialExpiry(organizationId);
  }

  @Post('calculate-pricing')
  async calculatePricing(
    @Body() body: { planId: string; userCount: number; billingCycle?: BillingCycle },
  ) {
    const { planId, userCount, billingCycle } = body;
    
    if (!planId || !userCount) {
      throw new BadRequestException('planId and userCount are required');
    }

    // If billingCycle is provided, return pricing for that cycle
    if (billingCycle) {
      const result = await this.pricingCalculationService.calculateSubscriptionPrice(
        planId,
        userCount,
        billingCycle,
      );
      return result;
    }

    // Otherwise, return pricing breakdown for both cycles
    const breakdown = await this.pricingCalculationService.getPricingForUserCount(
      planId,
      userCount,
    );
    return breakdown;
  }

  // ===== INVOICES ROUTES (/subscriptions/invoices/*) =====
  // NOTE: These must come BEFORE parameterized routes like :id to avoid route conflicts
  @Post('invoices')
  createInvoice(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.createInvoice(createInvoiceDto);
  }

  @Get('invoices')
  findAllInvoices(@Query() query: InvoiceQueryDto) {
    return this.invoicesService.findAll(query);
  }

  @Get('invoices/generate-invoice-number')
  generateInvoiceNumber() {
    return this.invoicesService.generateInvoiceNumber();
  }

  @Get('invoices/organization/:organizationId/billing-history')
  getBillingHistory(@Param('organizationId') organizationId: string) {
    return this.invoicesService.getBillingHistory(organizationId);
  }

  @Post('stripe/customer-portal')
  async createStripeCustomerPortal(
    @Body() body: { organizationId: string; returnUrl?: string },
  ) {
    // Get active subscription to find Stripe customer ID
    const subscription = await this.subscriptionsService.findActiveSubscriptionByOrganizationId(
      body.organizationId,
    );

    if (!subscription || !subscription.stripeCustomerId) {
      throw new BadRequestException(
        'No active Stripe subscription found for this organization. Please ensure you have an active subscription with Stripe.',
      );
    }

    const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL?.replace(':4000', ':3000') || 'http://localhost:3000';
    const returnUrl = body.returnUrl || `${baseUrl}/dashboard/subscriptions`;

    // Create Customer Portal session
    const portalSession = await this.stripeService.createCustomerPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl,
    });

    return {
      success: true,
      url: portalSession.url,
    };
  }

  @Get('invoices/:id')
  findInvoiceById(@Param('id') id: string) {
    return this.invoicesService.findInvoiceById(id);
  }

  @Get('invoices/:id/download')
  async downloadInvoice(@Param('id') id: string, @Res() res: Response) {
    const invoice = await this.invoicesService.findInvoiceById(id);
    const pdfBuffer = await this.invoicesService.generateInvoicePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  }

  // ===== SUBSCRIPTION ROUTES WITH PARAMETERS (/subscriptions/:id/*) =====
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findSubscriptionById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.updateSubscription(
      id,
      updateSubscriptionDto,
    );
  }

  @Post('initiate-payment')
  async initiatePayment(
    @Body() body: {
      planId: string;
      billingCycle: BillingCycle;
      organizationId: string;
      paymentProvider?: string;
      userCount?: number;
    },
  ) {
    if (!body.paymentProvider) {
      throw new BadRequestException('Payment provider is required. Please select Razorpay or Stripe.');
    }
    
    const paymentProvider = body.paymentProvider.toUpperCase() === 'STRIPE' 
      ? PaymentProvider.STRIPE 
      : PaymentProvider.RAZORPAY;
    
    return this.subscriptionPaymentService.initiatePayment(
      body.planId,
      body.billingCycle,
      body.organizationId,
      paymentProvider,
      body.userCount,
    );
  }

  @Post('calculate-upgrade-pricing')
  async calculateUpgradePricing(
    @Body() body: {
      planId: string;
      userCount: number;
      billingCycle?: BillingCycle;
      organizationId: string;
    },
  ) {
    const { planId, userCount, billingCycle, organizationId } = body;

    if (!planId || !userCount || !organizationId) {
      throw new BadRequestException('planId, userCount, and organizationId are required');
    }

    // Get existing subscription
    const existingSubscription = await this.subscriptionsService.findActiveSubscriptionByOrganizationId(
      organizationId,
    );

    if (!existingSubscription || existingSubscription.status === 'TRIAL') {
      // Trial to paid - return full pricing
      if (!billingCycle) {
        return this.pricingCalculationService.getPricingForUserCount(planId, userCount);
      }
      return this.pricingCalculationService.calculateSubscriptionPrice(
        planId,
        userCount,
        billingCycle,
      );
    }

    // Active subscription - calculate upgrade pricing with proration
    const plan = await this.subscriptionPlansService.findSubscriptionPlanById(planId);
    const oldPlan = await this.subscriptionPlansService.findSubscriptionPlanById(
      existingSubscription.planId,
    );

    const isPlanChange = existingSubscription.planId !== planId;
    const isUserIncrease = userCount > (existingSubscription.userCount || 1);

    if (!isPlanChange && !isUserIncrease) {
      throw new BadRequestException('No changes detected');
    }

    // Calculate proration details
    const periodStart = existingSubscription.currentPeriodStart || new Date();
    const periodEnd = existingSubscription.currentPeriodEnd || new Date();

    const daysRemaining = this.prorationCalculationService.calculateDaysRemaining(periodStart, periodEnd);
    const totalDays = this.prorationCalculationService.calculateTotalDaysInPeriod(periodStart, periodEnd);

    let prorationDetails: any = null;
    let netCharge = 0;

    if (isPlanChange && isUserIncrease) {
      // Combined upgrade
      // Use actual amount paid for credit calculation
      const oldActualAmount = existingSubscription.finalAmount || existingSubscription.amount;
      const result = this.prorationCalculationService.calculateCombinedUpgradeCharge(
        oldPlan,
        plan,
        existingSubscription.userCount || 1,
        userCount,
        existingSubscription.billingCycle,
        daysRemaining,
        totalDays,
        oldActualAmount,
      );
      netCharge = result.totalCharge;
      prorationDetails = {
        daysRemaining,
        totalDays,
        proratedAmount: result.totalCharge,
        creditAmount: result.creditAmount,
        chargeAmount: result.chargeAmount,
        // Include calculation details from the underlying plan upgrade calculation
        calculationDetails: (result as any).calculationDetails,
      };
    } else if (isPlanChange) {
      // Plan upgrade only
      // Use actual amount paid for credit calculation
      const oldActualAmount = existingSubscription.finalAmount || existingSubscription.amount;
      const result = this.prorationCalculationService.calculatePlanUpgradeCharge(
        oldPlan,
        plan,
        existingSubscription.userCount || 1,
        userCount,
        existingSubscription.billingCycle,
        daysRemaining,
        totalDays,
        oldActualAmount,
      );
      netCharge = result.netCharge;
      prorationDetails = {
        daysRemaining,
        totalDays,
        proratedAmount: result.netCharge,
        creditAmount: result.creditAmount,
        chargeAmount: result.chargeAmount,
        calculationDetails: result.calculationDetails,
      };
    } else {
      // User addition only
      const oldPricing = await this.pricingCalculationService.getCurrentSubscriptionPricing(
        oldPlan,
        existingSubscription.userCount || 1,
        existingSubscription.billingCycle,
      );
      const newPricing = await this.pricingCalculationService.calculateSubscriptionPrice(
        planId,
        userCount,
        existingSubscription.billingCycle,
      );
      
      // Calculate days remaining
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

      // Use actual subscription amount paid for credit calculation
      const oldActualAmount = existingSubscription.finalAmount || existingSubscription.amount || oldPricing.totalAmount;
      
      // Credit: Prorated value of what was paid for old users for remaining days
      const creditAmount = this.prorationCalculationService.calculateProratedAmount(
        oldActualAmount,
        daysRemaining,
        totalDays,
      );
      
      // Charge: Prorated value for all new users for remaining days
      const chargeAmount = this.prorationCalculationService.calculateProratedAmount(
        newPricing.totalAmount,
        daysRemaining,
        totalDays,
      );
      
      // Net charge = Charge - Credit
      netCharge = chargeAmount - creditAmount;
      
      prorationDetails = {
        daysRemaining,
        totalDays,
        proratedAmount: netCharge,
        creditAmount: Math.round(creditAmount * 100) / 100,
        chargeAmount: Math.round(chargeAmount * 100) / 100,
        netCharge: Math.round(netCharge * 100) / 100,
      };
    }

    const newPricing = await this.pricingCalculationService.calculateSubscriptionPrice(
      planId,
      userCount,
      billingCycle || existingSubscription.billingCycle,
    );

    return {
      ...newPricing,
      prorationDetails,
      netCharge,
    };
  }

  @Post('verify-payment')
  async verifyPayment(@Body() body: VerifyPaymentDto & {
    organizationId: string;
    paymentProvider?: string;
    pendingChanges: {
      planId: string;
      userCount: number;
      billingCycle: BillingCycle;
      operationType: 'TRIAL_TO_PAID' | 'UPGRADE' | 'ADD_USERS' | 'COMBINED';
      existingSubscriptionId?: string | null;
    };
    pricingBreakdown: {
      basePricePerUser: number;
      volumeDiscountPercent: number;
      discountedPricePerUser: number;
      totalAmount: number;
      prorationDetails?: any;
    };
  }) {
    const { organizationId, pendingChanges, pricingBreakdown, ...verifyPaymentDto } = body;

    if (!organizationId || !pendingChanges || !pricingBreakdown) {
      throw new BadRequestException(
        'organizationId, pendingChanges, and pricingBreakdown are required',
      );
    }

    // Normalize pricingBreakdown to ensure all numeric values are actually numbers
    // This handles cases where JSON parsing might return strings or nested structures
    const normalizedPricingBreakdown = {
      basePricePerUser: typeof pricingBreakdown.basePricePerUser === 'number' 
        ? pricingBreakdown.basePricePerUser 
        : parseFloat(String(pricingBreakdown.basePricePerUser || 0)),
      volumeDiscountPercent: typeof pricingBreakdown.volumeDiscountPercent === 'number'
        ? pricingBreakdown.volumeDiscountPercent
        : parseFloat(String(pricingBreakdown.volumeDiscountPercent || 0)),
      discountedPricePerUser: typeof pricingBreakdown.discountedPricePerUser === 'number'
        ? pricingBreakdown.discountedPricePerUser
        : parseFloat(String(pricingBreakdown.discountedPricePerUser || 0)),
      totalAmount: typeof pricingBreakdown.totalAmount === 'number'
        ? pricingBreakdown.totalAmount
        : parseFloat(String(pricingBreakdown.totalAmount || 0)),
      prorationDetails: pricingBreakdown.prorationDetails ? {
        daysRemaining: typeof pricingBreakdown.prorationDetails.daysRemaining === 'number'
          ? pricingBreakdown.prorationDetails.daysRemaining
          : parseFloat(String(pricingBreakdown.prorationDetails.daysRemaining || 0)),
        totalDays: typeof pricingBreakdown.prorationDetails.totalDays === 'number'
          ? pricingBreakdown.prorationDetails.totalDays
          : parseFloat(String(pricingBreakdown.prorationDetails.totalDays || 0)),
        proratedAmount: typeof pricingBreakdown.prorationDetails.proratedAmount === 'number'
          ? pricingBreakdown.prorationDetails.proratedAmount
          : parseFloat(String(pricingBreakdown.prorationDetails.proratedAmount || 0)),
        creditAmount: pricingBreakdown.prorationDetails.creditAmount !== undefined
          ? (typeof pricingBreakdown.prorationDetails.creditAmount === 'number'
            ? pricingBreakdown.prorationDetails.creditAmount
            : parseFloat(String(pricingBreakdown.prorationDetails.creditAmount || 0)))
          : undefined,
        chargeAmount: pricingBreakdown.prorationDetails.chargeAmount !== undefined
          ? (typeof pricingBreakdown.prorationDetails.chargeAmount === 'number'
            ? pricingBreakdown.prorationDetails.chargeAmount
            : parseFloat(String(pricingBreakdown.prorationDetails.chargeAmount || 0)))
          : undefined,
      } : undefined,
    };

    // Validate normalized values
    if (isNaN(normalizedPricingBreakdown.basePricePerUser) || 
        isNaN(normalizedPricingBreakdown.totalAmount)) {
      throw new BadRequestException(
        'Invalid pricingBreakdown: basePricePerUser and totalAmount must be valid numbers',
      );
    }

    const paymentProvider = body.paymentProvider 
      ? (body.paymentProvider.toUpperCase() === 'STRIPE' ? PaymentProvider.STRIPE : PaymentProvider.RAZORPAY)
      : PaymentProvider.RAZORPAY;

    const result = await this.subscriptionPaymentService.processPayment(
      organizationId,
      verifyPaymentDto.orderId,
      verifyPaymentDto.paymentId,
      verifyPaymentDto.signature,
      pendingChanges,
      normalizedPricingBreakdown,
      paymentProvider,
    );

    return {
      success: true,
      message: 'Payment verified and subscription activated',
      subscriptionId: result.subscriptionId,
      invoiceId: result.invoiceId,
    };
  }

  @Get(':id/invoices')
  getSubscriptionInvoices(@Param('id') id: string, @Query() query: InvoiceQueryDto) {
    return this.invoicesService.findAll({
      ...query,
      subscriptionId: id,
    });
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Body() body?: { reason?: string }) {
    // Get organization ID from subscription
    const subscription = await this.subscriptionsService.findSubscriptionById(id);
    return this.subscriptionsService.cancelSubscription(
      subscription.organizationId,
      body?.reason,
    );
  }

  @Post(':id/schedule-user-reduction')
  async scheduleUserReduction(
    @Param('id') id: string,
    @Body() body: { userCount: number; reason?: string },
  ) {
    // Get organization ID from subscription
    const subscription = await this.subscriptionsService.findSubscriptionById(id);
    return this.subscriptionsService.scheduleUserCountReduction(
      subscription.organizationId,
      body.userCount,
      body.reason,
    );
  }

  @Post(':id/schedule-downgrade')
  async scheduleDowngrade(
    @Param('id') id: string,
    @Body() body: { planId: string; reason?: string },
  ) {
    // Get organization ID from subscription
    const subscription = await this.subscriptionsService.findSubscriptionById(id);
    return this.subscriptionsService.schedulePlanDowngrade(
      subscription.organizationId,
      body.planId,
      body.reason,
    );
  }

  @Patch(':id/upgrade')
  async upgradePlan(
    @Param('id') id: string,
    @Body() body: { newPlanId: string },
  ) {
    // Get organization ID from subscription
    const subscription = await this.subscriptionsService.findSubscriptionById(id);
    return this.subscriptionsService.upgradeOrDowngradePlan(
      subscription.organizationId,
      body.newPlanId,
    );
  }

  @Patch(':id/downgrade')
  async downgradePlan(
    @Param('id') id: string,
    @Body() body: { newPlanId: string },
  ) {
    // Get organization ID from subscription
    const subscription = await this.subscriptionsService.findSubscriptionById(id);
    return this.subscriptionsService.upgradeOrDowngradePlan(
      subscription.organizationId,
      body.newPlanId,
    );
  }

  @Patch(':id/billing-cycle')
  async changeBillingCycle(
    @Param('id') id: string,
    @Body() body: { newBillingCycle: BillingCycle },
  ) {
    // Get organization ID from subscription
    const subscription = await this.subscriptionsService.findSubscriptionById(id);
    return this.subscriptionsService.changeBillingCycle(
      subscription.organizationId,
      body.newBillingCycle,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subscriptionsService.removeSubscription(id);
  }

  @Patch('invoices/:id')
  updateInvoice(@Param('id') id: string, @Body() updateInvoiceDto: UpdateInvoiceDto) {
    return this.invoicesService.updateInvoice(id, updateInvoiceDto);
  }

  @Patch('invoices/:id/mark-paid')
  markInvoiceAsPaid(@Param('id') id: string) {
    return this.invoicesService.markInvoiceAsPaid(id);
  }

  @Delete('invoices/:id')
  removeInvoice(@Param('id') id: string) {
    return this.invoicesService.removeInvoice(id);
  }
}
