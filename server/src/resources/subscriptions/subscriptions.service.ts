import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Transaction, Op } from 'sequelize';
import moment from 'moment-timezone';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionQueryDto } from './dto/query.dto';
import { SubscriptionRepository } from './subscription.repository';
import { Subscription, SubscriptionStatus, BillingCycle } from './entities/subscription.entity';
import { BaseService } from 'src/common/services/base.service';
import { InjectModel } from '@nestjs/sequelize';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { User, UserStatus } from 'src/resources/users/entities/user.entity';
import { PricingCalculationService } from './services/pricing-calculation.service';
import { ProrationCalculationService } from './services/proration-calculation.service';
import { InvoiceGenerationService } from './services/invoice-generation.service';
import { DateNormalizationService } from './services/date-normalization.service';
import { PeriodCalculationService } from './services/period-calculation.service';
import { TransactionManager } from 'src/common/services/transaction-manager.service';
import { QuotaManagementService } from 'src/common/services/quota-management.service';
import { AdminUpgradeSubscriptionDto, AdminUpdateUserCountDto } from './dto/admin-upgrade.dto';
import { Currency } from './entities/subscription.entity';

@Injectable()
export class SubscriptionsService extends BaseService<Subscription> {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    @InjectModel(SubscriptionPlan)
    private readonly subscriptionPlanModel: typeof SubscriptionPlan,
    @InjectModel(Organization)
    private readonly organizationModel: typeof Organization,
    @InjectModel(User)
    private readonly userModel: typeof User,
    private readonly pricingCalculationService: PricingCalculationService,
    private readonly prorationCalculationService: ProrationCalculationService,
    private readonly invoiceGenerationService: InvoiceGenerationService,
    private readonly dateNormalizationService: DateNormalizationService,
    private readonly periodCalculationService: PeriodCalculationService,
    private readonly transactionManager: TransactionManager,
    private readonly quotaManagementService: QuotaManagementService,
  ) {
    super(subscriptionRepository);
  }

  async createSubscription(
    createSubscriptionDto: CreateSubscriptionDto,
    transaction?: Transaction,
  ): Promise<Subscription> {
    // Verify organization exists
    const organization = await this.organizationModel.findByPk(
      createSubscriptionDto.organizationId,
      { transaction },
    );
    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${createSubscriptionDto.organizationId} not found`,
      );
    }

    // Verify plan exists
    const plan = await this.subscriptionPlanModel.findByPk(
      createSubscriptionDto.planId,
      { transaction },
    );
    if (!plan) {
      throw new NotFoundException(
        `Subscription plan with ID ${createSubscriptionDto.planId} not found`,
      );
    }

    // Check if organization already has an active or trial subscription
    // Use SELECT FOR UPDATE to prevent race conditions in concurrent requests
    // This ensures atomicity when checking and creating subscriptions
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: {
        organizationId: createSubscriptionDto.organizationId,
        status: {
          [Op.in]: ['ACTIVE', 'TRIAL'],
        },
      },
      transaction,
      // Note: Sequelize doesn't directly support FOR UPDATE in findOne
      // The transaction isolation level (REPEATABLE READ or SERIALIZABLE) 
      // combined with the unique index helps prevent race conditions
      // For additional protection, we could use raw queries with FOR UPDATE
    }) as Subscription | null;

    if (existingSubscription) {
      throw new ConflictException(
        `Organization already has an ${existingSubscription.status.toLowerCase()} subscription. Please cancel the existing subscription first.`,
      );
    }

    // Convert date strings to Date objects for Sequelize
    const subscriptionData = this.dateNormalizationService.normalizeDateFields(
      { ...createSubscriptionDto },
      [
        'currentPeriodStart',
        'currentPeriodEnd',
        'trialStart',
        'trialEnd',
        'cancelAt',
        'cancelledAt',
      ],
    ) as any;

    const subscription = await this.subscriptionRepository.create(
      subscriptionData,
      transaction,
    );

    // Clear quota cache for the organization to reflect new plan limits
    // This ensures users get the correct daily email limit immediately after subscription creation
    await this.quotaManagementService.clearCache(undefined, createSubscriptionDto.organizationId);
    this.logger.debug(`Cleared quota cache for organization ${createSubscriptionDto.organizationId} after subscription creation`);

    return subscription;
  }

  async findAll(query?: SubscriptionQueryDto) {
    const whereConditions: any = {};

    // Don't put organizationId in whereConditions - pass via RepositoryOptions.organizationId
    // so BaseRepository.applyTenantFilter() can handle it properly for employees

    if (query?.planId) {
      whereConditions.planId = query.planId;
    }

    if (query?.status) {
      whereConditions.status = query.status;
    }

    return this.subscriptionRepository.findAll({
      where: whereConditions,
      organizationId: query?.organizationId, // Pass via RepositoryOptions for employee filtering
      include: [
        {
          model: SubscriptionPlan,
          as: 'plan',
        },
        {
          model: Organization,
          as: 'organization',
        },
      ],
      pagination: {
        page: query?.page ? parseInt(query.page) : 1,
        limit: query?.limit ? parseInt(query.limit) : 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      },
    });
  }

  async findSubscriptionById(id: string, transaction?: Transaction): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
      include: [
        {
          model: SubscriptionPlan,
          as: 'plan',
        },
      ],
      transaction,
    });
    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }
    return subscription as Subscription;
  }

  async findActiveSubscriptionByOrganizationId(
    organizationId: string,
  ): Promise<Subscription | null> {
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        organizationId,
        status: {
          [Op.in]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
        },
      },
      include: [
        {
          model: SubscriptionPlan,
          as: 'plan',
        },
      ],
    });
    return subscription as Subscription | null;
  }

  async updateSubscription(
    id: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
    transaction?: Transaction,
  ): Promise<Subscription> {
    // Convert date strings to Date objects for Sequelize
    const updateData = this.dateNormalizationService.normalizeDateFields(
      { ...updateSubscriptionDto },
      [
        'currentPeriodStart',
        'currentPeriodEnd',
        'trialStart',
        'trialEnd',
        'cancelAt',
        'cancelledAt',
      ],
    ) as any;

    const affectedCount = await this.subscriptionRepository.update(
      { id },
      updateData,
      transaction,
    );

    if (affectedCount === 0) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    return this.findSubscriptionById(id, transaction);
  }


  async removeSubscription(id: string): Promise<Subscription> {
    const subscription = await this.findSubscriptionById(id);
    await this.softDelete({ id }, undefined);
    return subscription;
  }

  /**
   * Recalculate subscription pricing based on paid userCount
   * Only recalculates if subscription is on a paid plan (not trial)
   * 
   * IMPORTANT: This method ONLY updates pricing, NOT userCount.
   * userCount should ONLY be updated during upgrade/payment flow.
   * The subscription.userCount represents what was paid for and should not be changed here.
   */
  async recalculateSubscriptionIfNeeded(organizationId: string): Promise<void> {
    const subscription = await this.findActiveSubscriptionByOrganizationId(organizationId);

    if (!subscription) {
      this.logger.warn(
        `No active subscription found for organization ${organizationId} when recalculating pricing`,
      );
      return;
    }

    // If on trial, no price change needed
    if (subscription.status === SubscriptionStatus.TRIAL) {
      this.logger.debug(
        `Subscription ${subscription.id} is on trial - no price recalculation needed`,
      );
      return;
    }

    // IMPORTANT: This method should ONLY recalculate pricing, NOT update userCount
    // userCount should ONLY be updated during upgrade/payment flow
    // subscription.userCount represents what was paid for, not just active users
    
    // Get subscription's userCount (what was paid for) - DO NOT MODIFY IT
    const paidUserCount = subscription.userCount || 1;

    // Calculate pricing based on what was paid for
    const pricingResult = await this.pricingCalculationService.calculateSubscriptionPrice(
      subscription.planId,
      paidUserCount, // Use paid userCount, not active user count
      subscription.billingCycle,
    );

    if (pricingResult.requiresContactSales) {
      this.logger.warn(
        `Organization ${organizationId} has ${paidUserCount} paid users - requires contact sales. Subscription not updated.`,
      );
      return;
    }

    // Update subscription pricing ONLY - DO NOT update userCount
    // userCount should only be updated via payment/upgrade flow
    await this.updateSubscription(subscription.id, {
      // userCount: NOT UPDATED - preserve what was paid for
      volumeDiscountPercent: pricingResult.volumeDiscountPercent,
      finalAmount: pricingResult.totalAmount,
      amount: pricingResult.totalAmount,
    });

    this.logger.log(
      `Recalculated subscription pricing for organization ${organizationId}: paid for ${paidUserCount} users, ${pricingResult.volumeDiscountPercent}% discount, $${pricingResult.totalAmount}`,
    );
  }

  /**
   * Upgrade or downgrade subscription plan
   * Upgrade: Charge prorated difference for remaining days
   * Downgrade: No credit, takes effect at next billing cycle
   */
  async upgradeOrDowngradePlan(
    organizationId: string,
    newPlanId: string,
  ): Promise<Subscription> {
    return this.transactionManager.execute(async (transaction) => {
    const subscription = await this.findActiveSubscriptionByOrganizationId(organizationId);

    if (!subscription) {
      throw new NotFoundException(
        `No active subscription found for organization ${organizationId}`,
      );
    }

    if (subscription.status === SubscriptionStatus.TRIAL) {
      throw new BadRequestException('Cannot change plan during trial period');
    }

      const newPlan = await this.subscriptionPlanModel.findByPk(newPlanId, { transaction });
    if (!newPlan) {
      throw new NotFoundException(`Subscription plan with ID ${newPlanId} not found`);
    }

      const oldPlan = await this.subscriptionPlanModel.findByPk(subscription.planId, {
        transaction,
      });
    if (!oldPlan) {
      throw new NotFoundException(`Current subscription plan not found`);
    }

      // Determine if upgrade or downgrade using centralized plan price helper
      const oldPrice = this.pricingCalculationService.getPlanPrice(
        oldPlan,
        subscription.billingCycle,
      );
      const newPrice = this.pricingCalculationService.getPlanPrice(
        newPlan,
        subscription.billingCycle,
      );

    const isUpgrade = newPrice > oldPrice;
    const userCount = subscription.userCount || 1;

    if (isUpgrade) {
      // Upgrade: Charge prorated difference
      const periodStart = new Date(subscription.currentPeriodStart);
      const periodEnd = new Date(subscription.currentPeriodEnd);
      const daysRemaining = this.prorationCalculationService.calculateDaysRemaining(
        periodStart,
        periodEnd,
      );
      const totalDays = this.prorationCalculationService.calculateTotalDaysInPeriod(
        periodStart,
        periodEnd,
      );

      const upgradeResult = this.prorationCalculationService.calculatePlanUpgradeCharge(
        oldPlan,
        newPlan,
        userCount, // old user count
        userCount, // new user count (same for plan-only upgrade)
        subscription.billingCycle,
        daysRemaining,
        totalDays,
          subscription.finalAmount || subscription.amount,
      );

      // Recalculate pricing with new plan
      const pricingResult = await this.pricingCalculationService.calculateSubscriptionPrice(
        newPlanId,
        userCount,
        subscription.billingCycle,
      );

      // Update subscription
        const updatedSubscription = await this.updateSubscription(
          subscription.id,
          {
        planId: newPlanId,
        userCount: pricingResult.userCount,
        volumeDiscountPercent: pricingResult.volumeDiscountPercent,
        finalAmount: pricingResult.totalAmount,
        amount: pricingResult.totalAmount,
          },
          transaction,
        );

      // Generate prorated invoice for upgrade
      if (upgradeResult.netCharge > 0) {
        await this.invoiceGenerationService.generateUpgradeInvoice(
          organizationId,
          subscription.id,
          upgradeResult.netCharge,
          oldPlan.name,
          newPlan.name,
            transaction,
        );
      }

      this.logger.log(
        `Upgraded subscription ${subscription.id} from ${oldPlan.name} to ${newPlan.name}. Prorated charge: $${upgradeResult.netCharge}`,
      );

      // Clear quota cache for the organization to reflect new plan limits
      await this.quotaManagementService.clearCache(undefined, organizationId);
      this.logger.debug(`Cleared quota cache for organization ${organizationId} after plan upgrade`);

      return updatedSubscription;
    } else {
      // Downgrade: Schedule for next billing cycle (no credit)
      return await this.schedulePlanDowngrade(
        organizationId,
        newPlanId,
        `Plan downgrade: ${oldPlan.name} → ${newPlan.name}`,
      );
    }
    });
  }

  /**
   * Change billing cycle (Monthly ↔ Annual)
   */
  async changeBillingCycle(
    organizationId: string,
    newBillingCycle: BillingCycle,
  ): Promise<Subscription> {
    return this.transactionManager.execute(async (transaction) => {
    const subscription = await this.findActiveSubscriptionByOrganizationId(organizationId);

    if (!subscription) {
      throw new NotFoundException(
        `No active subscription found for organization ${organizationId}`,
      );
    }

    if (subscription.status === SubscriptionStatus.TRIAL) {
      throw new BadRequestException('Cannot change billing cycle during trial period');
    }

    if (subscription.billingCycle === newBillingCycle) {
      throw new BadRequestException(
        `Subscription is already on ${newBillingCycle} billing cycle`,
      );
    }

      const plan = await this.subscriptionPlanModel.findByPk(subscription.planId, {
        transaction,
      });
    if (!plan) {
      throw new NotFoundException(`Subscription plan not found`);
    }

    const userCount = subscription.userCount || 1;
    const periodStart = new Date(subscription.currentPeriodStart);
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const daysRemaining = this.prorationCalculationService.calculateDaysRemaining(
      periodStart,
      periodEnd,
    );
    const totalDays = this.prorationCalculationService.calculateTotalDaysInPeriod(
      periodStart,
      periodEnd,
    );

    // Calculate billing cycle change charge/credit
    const cycleChange = this.prorationCalculationService.calculateBillingCycleChangeCharge(
      subscription.billingCycle,
      newBillingCycle,
      plan,
      userCount,
      daysRemaining,
      totalDays,
    );

    // Recalculate pricing with new billing cycle
    const pricingResult = await this.pricingCalculationService.calculateSubscriptionPrice(
      subscription.planId,
      userCount,
      newBillingCycle,
    );

    // Calculate new period end date
    const now = moment();
      const newPeriodEnd = this.periodCalculationService.calculatePeriodEnd(
        now.toDate(),
        newBillingCycle,
      );

    // Update subscription
      const updatedSubscription = await this.updateSubscription(
        subscription.id,
        {
      billingCycle: newBillingCycle,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: newPeriodEnd.toISOString(),
      userCount: pricingResult.userCount,
      volumeDiscountPercent: pricingResult.volumeDiscountPercent,
      finalAmount: pricingResult.totalAmount,
      amount: pricingResult.totalAmount,
        },
        transaction,
      );

    // Generate invoice/credit note
    if (cycleChange.netCharge > 0) {
      await this.invoiceGenerationService.generateProratedInvoice(
        organizationId,
        subscription.id,
        cycleChange.netCharge,
        `Billing cycle change from ${subscription.billingCycle} to ${newBillingCycle}`,
          transaction,
      );
    } else if (cycleChange.netCharge < 0) {
      await this.invoiceGenerationService.generateDowngradeCredit(
        organizationId,
        subscription.id,
        Math.abs(cycleChange.netCharge),
        subscription.billingCycle,
        newBillingCycle,
          transaction,
      );
    }

    this.logger.log(
      `Changed billing cycle for subscription ${subscription.id} from ${subscription.billingCycle} to ${newBillingCycle}. Net charge: $${cycleChange.netCharge}`,
    );

    // Clear quota cache for the organization (billing cycle change doesn't affect daily limits but clearing for consistency)
    await this.quotaManagementService.clearCache(undefined, organizationId);
    this.logger.debug(`Cleared quota cache for organization ${organizationId} after billing cycle change`);

    return updatedSubscription;
    });
  }

  /**
   * Cancel subscription (no credit, use until expiry)
   */
  async cancelSubscription(
    organizationId: string,
    cancelReason?: string,
  ): Promise<Subscription> {
    const subscription = await this.findActiveSubscriptionByOrganizationId(organizationId);

    if (!subscription) {
      throw new NotFoundException(
        `No active subscription found for organization ${organizationId}`,
      );
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription is already cancelled');
    }

    // Set cancelAt to currentPeriodEnd - user keeps access until then
    const cancelAt = subscription.currentPeriodEnd || moment().toDate();

    // Update subscription - status remains ACTIVE until cancelAt
    const updatedSubscription = await this.updateSubscription(subscription.id, {
      cancelAt: cancelAt.toISOString(),
      cancelReason,
      // Status remains ACTIVE - scheduler will change to CANCELLED after cancelAt
    });

    this.logger.log(
      `Cancelled subscription ${subscription.id} for organization ${organizationId}. Access until ${cancelAt.toISOString()}. No credit given.`,
    );

    return updatedSubscription;
  }

  /**
   * Schedule user count reduction for next billing cycle (no credit)
   */
  async scheduleUserCountReduction(
    organizationId: string,
    newUserCount: number,
    reason?: string,
  ): Promise<Subscription> {
    const subscription = await this.findActiveSubscriptionByOrganizationId(organizationId);

    if (!subscription) {
      throw new NotFoundException(
        `No active subscription found for organization ${organizationId}`,
      );
    }

    if (subscription.status === SubscriptionStatus.TRIAL) {
      throw new BadRequestException('Cannot schedule user reduction during trial period');
    }

    const currentUserCount = subscription.userCount || 1;

    if (newUserCount >= currentUserCount) {
      throw new BadRequestException(
        `New user count (${newUserCount}) must be less than current user count (${currentUserCount})`,
      );
    }

    if (newUserCount < 1) {
      throw new BadRequestException('User count must be at least 1');
    }

    const updatedSubscription = await this.updateSubscription(subscription.id, {
      pendingUserCount: newUserCount,
      pendingChangeReason: reason || `User count reduction scheduled: ${currentUserCount} → ${newUserCount}`,
    });

    this.logger.log(
      `Scheduled user count reduction for subscription ${subscription.id}: ${currentUserCount} → ${newUserCount}. Will apply at next billing cycle (${subscription.currentPeriodEnd?.toISOString()}). No credit given.`,
    );

    return updatedSubscription;
  }

  /**
   * Schedule plan downgrade for next billing cycle (no credit)
   */
  async schedulePlanDowngrade(
    organizationId: string,
    newPlanId: string,
    reason?: string,
  ): Promise<Subscription> {
    const subscription = await this.findActiveSubscriptionByOrganizationId(organizationId);

    if (!subscription) {
      throw new NotFoundException(
        `No active subscription found for organization ${organizationId}`,
      );
    }

    if (subscription.status === SubscriptionStatus.TRIAL) {
      throw new BadRequestException('Cannot schedule plan downgrade during trial period');
    }

    const newPlan = await this.subscriptionPlanModel.findByPk(newPlanId);
    if (!newPlan) {
      throw new NotFoundException(`Subscription plan with ID ${newPlanId} not found`);
    }

    const oldPlan = await this.subscriptionPlanModel.findByPk(subscription.planId);
    if (!oldPlan) {
      throw new NotFoundException(`Current subscription plan not found`);
    }

    // Determine if this is actually a downgrade (lower price)
    const oldPrice =
      subscription.billingCycle === BillingCycle.YEARLY
        ? oldPlan.pricePerUserYearly || 0
        : oldPlan.pricePerUserMonthly || 0;
    const newPrice =
      subscription.billingCycle === BillingCycle.YEARLY
        ? newPlan.pricePerUserYearly || 0
        : newPlan.pricePerUserMonthly || 0;

    if (newPrice >= oldPrice) {
      throw new BadRequestException(
        `Plan ${newPlan.name} is not a downgrade from ${oldPlan.name}. Use upgrade flow for same or higher priced plans.`,
      );
    }

    const updatedSubscription = await this.updateSubscription(subscription.id, {
      pendingPlanId: newPlanId,
      pendingChangeReason: reason || `Plan downgrade scheduled: ${oldPlan.name} → ${newPlan.name}`,
    });

    this.logger.log(
      `Scheduled plan downgrade for subscription ${subscription.id}: ${oldPlan.name} → ${newPlan.name}. Will apply at next billing cycle (${subscription.currentPeriodEnd?.toISOString()}). No credit given.`,
    );

    return updatedSubscription;
  }

  /**
   * Validate plan change
   */
  validatePlanChange(currentPlan: SubscriptionPlan, newPlan: SubscriptionPlan): void {
    if (!currentPlan || !newPlan) {
      throw new BadRequestException('Both current and new plans must be provided');
    }

    if (currentPlan.id === newPlan.id) {
      throw new BadRequestException('New plan must be different from current plan');
    }

    if (!newPlan.isActive) {
      throw new BadRequestException('New plan is not active');
    }
  }

  /**
   * Validate billing cycle change
   */
  validateBillingCycleChange(
    currentCycle: BillingCycle,
    newCycle: BillingCycle,
  ): void {
    if (currentCycle === newCycle) {
      throw new BadRequestException(
        `Subscription is already on ${newCycle} billing cycle`,
      );
    }
  }

  /**
   * Validate cancellation
   */
  validateCancellation(subscription: Subscription): void {
    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription is already cancelled');
    }

    if (subscription.cancelAt && new Date(subscription.cancelAt) <= new Date()) {
      throw new BadRequestException('Subscription cancellation is already scheduled');
    }
  }

  /**
   * Admin upgrade subscription - bypasses payment, creates subscription with zero invoice
   * Cancels old subscription and creates new one with selected plan and user count.
   * Period length: 1 month for MONTHLY, 1 year for YEARLY billing cycle.
   */
  async adminUpgradeSubscription(
    dto: AdminUpgradeSubscriptionDto,
  ): Promise<Subscription> {
    return this.transactionManager.execute(async (transaction) => {
      // Validate organization exists
      const organization = await this.organizationModel.findByPk(
        dto.organizationId,
        { transaction },
      );
      if (!organization) {
        throw new NotFoundException(
          `Organization with ID ${dto.organizationId} not found`,
        );
      }

      // Validate plan exists
      const plan = await this.subscriptionPlanModel.findByPk(dto.planId, {
        transaction,
      });
      if (!plan) {
        throw new NotFoundException(`Subscription plan with ID ${dto.planId} not found`);
      }

      if (!plan.isActive) {
        throw new BadRequestException('Selected plan is not active');
      }

      // Validate user count
      if (dto.userCount < 1) {
        throw new BadRequestException('User count must be at least 1');
      }

      // Use provided billing cycle or default to MONTHLY
      const billingCycle = dto.billingCycle || BillingCycle.MONTHLY;

      // Check if subscription exists and cancel it
      const existingSubscription = await this.findActiveSubscriptionByOrganizationId(
        dto.organizationId,
      );

      if (existingSubscription) {
        // Cancel the old subscription
        const cancelAt = moment().toDate();
        await this.updateSubscription(
          existingSubscription.id,
          {
            status: SubscriptionStatus.CANCELLED,
            cancelAt: cancelAt.toISOString(),
            cancelledAt: cancelAt.toISOString(),
            cancelReason: `Cancelled due to admin upgrade to ${plan.name}`,
          },
          transaction,
        );

        this.logger.log(
          `Admin cancelled old subscription ${existingSubscription.id} for organization ${dto.organizationId}`,
        );
      }

      const now = moment();
      const periodStart = now.toDate();
      const periodEnd = this.periodCalculationService.calculatePeriodEnd(
        periodStart,
        billingCycle,
      );

      // Calculate pricing (for display purposes, but we'll set amount to 0)
      const pricingResult = await this.pricingCalculationService.calculateSubscriptionPrice(
        dto.planId,
        dto.userCount,
        billingCycle,
      );

      // Create new subscription
      const subscription = await this.createSubscription(
        {
          organizationId: dto.organizationId,
          planId: dto.planId,
          status: SubscriptionStatus.ACTIVE,
          billingCycle,
          amount: 0, // Free upgrade
          currency: Currency.USD,
          currentPeriodStart: periodStart.toISOString(),
          currentPeriodEnd: periodEnd.toISOString(),
          userCount: dto.userCount,
          volumeDiscountPercent: pricingResult.volumeDiscountPercent,
          finalAmount: 0, // Free upgrade
        },
        transaction,
      );

      this.logger.log(
        `Admin created new subscription ${subscription.id} for organization ${dto.organizationId}: Plan ${plan.name}, ${dto.userCount} users, ${billingCycle}`,
      );

      // Generate zero-amount invoice
      await this.invoiceGenerationService.generateAdminUpgradeInvoice(
        dto.organizationId,
        subscription.id,
        `Admin upgrade: ${plan.name} - ${dto.userCount} user${dto.userCount !== 1 ? 's' : ''}`,
        transaction,
      );

      // Clear quota cache
      await this.quotaManagementService.clearCache(undefined, dto.organizationId);
      this.logger.debug(
        `Cleared quota cache for organization ${dto.organizationId} after admin upgrade`,
      );

      return subscription;
    });
  }

  /**
   * Admin update user count - bypasses payment, updates subscription with zero invoice
   */
  async adminUpdateUserCount(dto: AdminUpdateUserCountDto): Promise<Subscription> {
    return this.transactionManager.execute(async (transaction) => {
      // Validate organization exists
      const organization = await this.organizationModel.findByPk(
        dto.organizationId,
        { transaction },
      );
      if (!organization) {
        throw new NotFoundException(
          `Organization with ID ${dto.organizationId} not found`,
        );
      }

      // Validate user count
      if (dto.userCount < 1) {
        throw new BadRequestException('User count must be at least 1');
      }

      // Get existing subscription
      const subscription = await this.findActiveSubscriptionByOrganizationId(
        dto.organizationId,
      );

      if (!subscription) {
        throw new NotFoundException(
          `No active subscription found for organization ${dto.organizationId}`,
        );
      }

      // Get plan
      const plan = await this.subscriptionPlanModel.findByPk(subscription.planId, {
        transaction,
      });
      if (!plan) {
        throw new NotFoundException(`Subscription plan not found`);
      }

      const currentUserCount = subscription.userCount || 1;

      if (dto.userCount === currentUserCount) {
        throw new BadRequestException(
          `User count is already ${dto.userCount}. No changes needed.`,
        );
      }

      // Calculate pricing with new user count
      const pricingResult = await this.pricingCalculationService.calculateSubscriptionPrice(
        subscription.planId,
        dto.userCount,
        subscription.billingCycle,
      );

      // Update subscription
      const updatedSubscription = await this.updateSubscription(
        subscription.id,
        {
          userCount: dto.userCount,
          volumeDiscountPercent: pricingResult.volumeDiscountPercent,
          amount: 0, // Free update
          finalAmount: 0, // Free update
          // Clear any pending user count changes
          pendingUserCount: null,
          pendingChangeReason: null,
        },
        transaction,
      );

      this.logger.log(
        `Admin updated user count for subscription ${subscription.id}: ${currentUserCount} → ${dto.userCount} users`,
      );

      // Generate zero-amount invoice
      await this.invoiceGenerationService.generateAdminUpgradeInvoice(
        dto.organizationId,
        subscription.id,
        `Admin user count update: ${currentUserCount} → ${dto.userCount} users`,
        transaction,
      );

      // Clear quota cache
      await this.quotaManagementService.clearCache(undefined, dto.organizationId);
      this.logger.debug(
        `Cleared quota cache for organization ${dto.organizationId} after admin user count update`,
      );

      return updatedSubscription;
    });
  }
}

