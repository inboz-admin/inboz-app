import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { BillingCycle } from '../entities/subscription.entity';

export interface PricingResult {
  planId: string;
  planName: string;
  userCount: number;
  billingCycle: BillingCycle;
  basePricePerUser: number;
  volumeDiscountPercent: number;
  discountedPricePerUser: number;
  totalAmount: number;
  currency: string;
  requiresContactSales: boolean;
}

export interface PricingBreakdown {
  planId: string;
  planName: string;
  userCount: number;
  monthly: {
    basePricePerUser: number;
    volumeDiscountPercent: number;
    discountedPricePerUser: number;
    totalAmount: number;
  };
  yearly: {
    basePricePerUser: number;
    volumeDiscountPercent: number;
    discountedPricePerUser: number;
    totalAmount: number;
  };
  requiresContactSales: boolean;
}

@Injectable()
export class PricingCalculationService {
  private readonly logger = new Logger(PricingCalculationService.name);

  constructor(
    @InjectModel(SubscriptionPlan)
    private readonly subscriptionPlanModel: typeof SubscriptionPlan,
  ) {}

  /**
   * Get plan price per user for a given billing cycle
   * Applies yearly "10 months pay" discount (10% off) if applicable
   */
  getPlanPrice(plan: SubscriptionPlan, cycle: BillingCycle): number {
    const basePrice =
      cycle === BillingCycle.YEARLY
        ? plan.pricePerUserYearly || 0
        : plan.pricePerUserMonthly || 0;

    if (cycle === BillingCycle.YEARLY && basePrice > 0) {
      return basePrice * 0.9; // 10 months pay = 90% of yearly price
    }
    return basePrice;
  }

  /**
   * Calculate volume discount percentage based on user count
   * 1-4 users: 0%
   * 5-10 users: 10%
   * 11-25 users: 15%
   * 26-50 users: 20%
   * 50+ users: Contact Sales (returns -1)
   */
  calculateVolumeDiscount(userCount: number): number {
    if (userCount < 1) {
      return 0;
    }

    if (userCount >= 1 && userCount <= 4) {
      return 0;
    } else if (userCount >= 5 && userCount <= 10) {
      return 10;
    } else if (userCount >= 11 && userCount <= 25) {
      return 15;
    } else if (userCount >= 26 && userCount <= 50) {
      return 20;
    } else {
      // 50+ users - Contact Sales
      return -1;
    }
  }

  /**
   * Calculate subscription price with volume discount
   */
  async calculateSubscriptionPrice(
    planId: string,
    userCount: number,
    billingCycle: BillingCycle,
  ): Promise<PricingResult> {
    const plan = await this.subscriptionPlanModel.findByPk(planId);

    if (!plan) {
      throw new BadRequestException(`Subscription plan with ID ${planId} not found`);
    }

    if (userCount < 1) {
      throw new BadRequestException('User count must be at least 1');
    }

    const volumeDiscountPercent = this.calculateVolumeDiscount(userCount);

    if (volumeDiscountPercent === -1) {
      // 50+ users - Contact Sales
      return {
        planId: plan.id,
        planName: plan.name,
        userCount,
        billingCycle,
        basePricePerUser: 0,
        volumeDiscountPercent: 0,
        discountedPricePerUser: 0,
        totalAmount: 0,
        currency: 'USD',
        requiresContactSales: true,
      };
    }

    // Get base price per user based on billing cycle (includes yearly discount if applicable)
    const basePricePerUser = this.getPlanPrice(plan, billingCycle);

    if (basePricePerUser === 0) {
      throw new BadRequestException(
        `Plan ${plan.name} does not have pricing configured for ${billingCycle} billing cycle`,
      );
    }

    // Calculate discounted price per user (apply volume discount on top)
    const discountMultiplier = 1 - volumeDiscountPercent / 100;
    const discountedPricePerUser = basePricePerUser * discountMultiplier;

    // Calculate total amount
    const totalAmount = discountedPricePerUser * userCount;

    return {
      planId: plan.id,
      planName: plan.name,
      userCount,
      billingCycle,
      basePricePerUser,
      volumeDiscountPercent,
      discountedPricePerUser: Math.round(discountedPricePerUser * 100) / 100, // Round to 2 decimals
      totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimals
      currency: 'USD',
      requiresContactSales: false,
    };
  }

  /**
   * Get pricing breakdown for both monthly and yearly billing cycles
   */
  async getPricingForUserCount(
    planId: string,
    userCount: number,
  ): Promise<PricingBreakdown> {
    const plan = await this.subscriptionPlanModel.findByPk(planId);

    if (!plan) {
      throw new BadRequestException(`Subscription plan with ID ${planId} not found`);
    }

    if (userCount < 1) {
      throw new BadRequestException('User count must be at least 1');
    }

    const volumeDiscountPercent = this.calculateVolumeDiscount(userCount);

    if (volumeDiscountPercent === -1) {
      // 50+ users - Contact Sales
      return {
        planId: plan.id,
        planName: plan.name,
        userCount,
        monthly: {
          basePricePerUser: 0,
          volumeDiscountPercent: 0,
          discountedPricePerUser: 0,
          totalAmount: 0,
        },
        yearly: {
          basePricePerUser: 0,
          volumeDiscountPercent: 0,
          discountedPricePerUser: 0,
          totalAmount: 0,
        },
        requiresContactSales: true,
      };
    }

    const monthlyBasePrice = this.getPlanPrice(plan, BillingCycle.MONTHLY);
    const yearlyBasePrice = this.getPlanPrice(plan, BillingCycle.YEARLY);

    const discountMultiplier = 1 - volumeDiscountPercent / 100;

    const monthlyDiscountedPrice = monthlyBasePrice * discountMultiplier;
    const yearlyDiscountedPrice = yearlyBasePrice * discountMultiplier;

    return {
      planId: plan.id,
      planName: plan.name,
      userCount,
      monthly: {
        basePricePerUser: monthlyBasePrice,
        volumeDiscountPercent,
        discountedPricePerUser: Math.round(monthlyDiscountedPrice * 100) / 100,
        totalAmount: Math.round(monthlyDiscountedPrice * userCount * 100) / 100,
      },
      yearly: {
        basePricePerUser: yearlyBasePrice,
        volumeDiscountPercent,
        discountedPricePerUser: Math.round(yearlyDiscountedPrice * 100) / 100,
        totalAmount: Math.round(yearlyDiscountedPrice * userCount * 100) / 100,
      },
      requiresContactSales: false,
    };
  }

  /**
   * Get current subscription pricing for credit calculation
   * Used when calculating prorated credits for upgrades
   */
  async getCurrentSubscriptionPricing(
    plan: SubscriptionPlan,
    userCount: number,
    billingCycle: BillingCycle,
  ): Promise<{
    basePricePerUser: number;
    volumeDiscountPercent: number;
    discountedPricePerUser: number;
    totalAmount: number;
  }> {
    const volumeDiscountPercent = this.calculateVolumeDiscount(userCount);

    const basePricePerUser = this.getPlanPrice(plan, billingCycle);

    if (basePricePerUser === 0) {
      return {
        basePricePerUser: 0,
        volumeDiscountPercent: 0,
        discountedPricePerUser: 0,
        totalAmount: 0,
      };
    }

    const discountMultiplier = 1 - volumeDiscountPercent / 100;
    const discountedPricePerUser = basePricePerUser * discountMultiplier;
    const totalAmount = discountedPricePerUser * userCount;

    return {
      basePricePerUser,
      volumeDiscountPercent,
      discountedPricePerUser: Math.round(discountedPricePerUser * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }
}
