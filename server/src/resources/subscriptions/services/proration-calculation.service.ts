import { Injectable, Inject, forwardRef } from '@nestjs/common';
import moment from 'moment-timezone';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { Subscription, BillingCycle } from '../entities/subscription.entity';
import { PricingCalculationService } from './pricing-calculation.service';

export interface ProratedChargeResult {
  proratedAmountForNewUser: number;
  additionalChargeForExistingUsers: number; // If volume discount changed
  totalAdditionalCharge: number;
  creditAmount: number; // If discount increased
  daysRemaining: number;
  totalDaysInPeriod: number;
}

@Injectable()
export class ProrationCalculationService {
  constructor(
    @Inject(forwardRef(() => PricingCalculationService))
    private readonly pricingCalculationService: PricingCalculationService,
  ) {}

  /**
   * Calculate prorated amount based on days remaining
   */
  calculateProratedAmount(
    price: number,
    daysRemaining: number,
    totalDaysInPeriod: number,
  ): number {
    if (totalDaysInPeriod <= 0 || daysRemaining <= 0) {
      return 0;
    }
    return Math.round((price * daysRemaining) / totalDaysInPeriod * 100) / 100;
  }

  /**
   * Calculate days remaining in billing period
   */
  calculateDaysRemaining(periodStart: Date, periodEnd: Date): number {
    const now = moment();
    const end = moment(periodEnd);

    if (now.isSameOrAfter(end)) {
      return 0;
    }

    const diffDays = end.diff(now, 'days', true);
    return Math.max(0, Math.ceil(diffDays));
  }

  /**
   * Calculate total days in billing period
   */
  calculateTotalDaysInPeriod(periodStart: Date, periodEnd: Date): number {
    const start = moment(periodStart);
    const end = moment(periodEnd);
    const diffDays = end.diff(start, 'days', true);
    return Math.max(1, Math.ceil(diffDays)); // At least 1 day
  }

  /**
   * Calculate prorated charge when user joins mid-cycle
   */
  calculateProratedSubscriptionCharge(
    subscription: Subscription,
    newUserCount: number,
    oldUserCount: number,
    oldPricePerUser: number,
    newPricePerUser: number,
  ): ProratedChargeResult {
    const periodStart = moment(subscription.currentPeriodStart);
    const periodEnd = moment(subscription.currentPeriodEnd);

    const daysRemaining = this.calculateDaysRemaining(periodStart.toDate(), periodEnd.toDate());
    const totalDaysInPeriod = this.calculateTotalDaysInPeriod(periodStart.toDate(), periodEnd.toDate());

    // Calculate number of new users being added
    const newUsersCount = newUserCount - oldUserCount;
    
    // Calculate prorated amount for ALL new users (not just one)
    // Example: If adding 2 users at $29/user for full month (31/31 days) = $29 × 2 = $58
    const proratedAmountForNewUsers = this.calculateProratedAmount(
      newPricePerUser * newUsersCount, // Multiply by number of new users
      daysRemaining,
      totalDaysInPeriod,
    );

    // If price per user changed (volume discount), calculate adjustment for existing users
    let additionalChargeForExistingUsers = 0;
    let creditAmount = 0;

    if (oldPricePerUser !== newPricePerUser && oldUserCount > 0) {
      const oldTotalForRemainingDays = this.calculateProratedAmount(
        oldPricePerUser * oldUserCount,
        daysRemaining,
        totalDaysInPeriod,
      );

      const newTotalForRemainingDays = this.calculateProratedAmount(
        newPricePerUser * oldUserCount,
        daysRemaining,
        totalDaysInPeriod,
      );

      const difference = newTotalForRemainingDays - oldTotalForRemainingDays;

      if (difference > 0) {
        // Price increased - charge more
        additionalChargeForExistingUsers = difference;
      } else {
        // Price decreased - credit
        creditAmount = Math.abs(difference);
      }
    }

    const totalAdditionalCharge = proratedAmountForNewUsers + additionalChargeForExistingUsers;

    return {
      proratedAmountForNewUser: proratedAmountForNewUsers, // Keep same field name for backward compatibility
      additionalChargeForExistingUsers,
      totalAdditionalCharge,
      creditAmount,
      daysRemaining,
      totalDaysInPeriod,
    };
  }

  /**
   * Calculate trial to paid plan price (full period, no proration)
   */
  calculateTrialToPaidPrice(
    plan: SubscriptionPlan,
    userCount: number,
    billingCycle: BillingCycle,
  ): number {
    const basePricePerUser = this.pricingCalculationService.getPlanPrice(plan, billingCycle);

    if (basePricePerUser === 0) {
      return 0;
    }

    // Calculate volume discount using centralized service
    const volumeDiscountPercent = this.pricingCalculationService.calculateVolumeDiscount(userCount);

    const discountMultiplier = 1 - volumeDiscountPercent / 100;
    const discountedPricePerUser = basePricePerUser * discountMultiplier;
    const totalAmount = discountedPricePerUser * userCount;

    return Math.round(totalAmount * 100) / 100;
  }

  /**
   * Calculate plan upgrade charge (difference for remaining days)
   * Enhanced to handle user count changes, volume discounts, and billing cycle changes
   * @param oldActualAmount - Optional: actual amount paid for old subscription (accounts for previous payments)
   * @param newBillingCycle - Optional: new billing cycle (if different from old, handles billing cycle change)
   */
  calculatePlanUpgradeCharge(
    oldPlan: SubscriptionPlan,
    newPlan: SubscriptionPlan,
    oldUserCount: number,
    newUserCount: number,
    oldBillingCycle: BillingCycle,
    daysRemaining: number,
    totalDaysInPeriod: number,
    oldActualAmount?: number,
    newBillingCycle?: BillingCycle,
  ): {
    creditAmount: number; // Credit for old plan
    chargeAmount: number; // Charge for new plan
    netCharge: number; // Net amount to charge
    calculationDetails?: {
      // Credit calculation details
      credit: {
        oldActualAmount?: number;
        oldPricePerUser: number;
        oldDiscountPercent: number;
        oldDiscountedPricePerUser: number;
        oldFullPeriodAmount: number;
        creditAmount: number;
        calculation: string;
      };
      // Charge calculation details
      charge: {
        newPricePerUser: number;
        newDiscountPercent: number;
        newDiscountedPricePerUser: number;
        newFullPeriodAmount: number;
        chargeAmount: number;
        calculation: string;
      };
      // Period details
      period: {
        daysRemaining: number;
        totalDaysInPeriod: number;
        prorationRatio: number;
      };
    };
  } {
    // Use old billing cycle for old plan pricing (credit calculation)
    const oldPricePerUserAdjustedRaw = this.pricingCalculationService.getPlanPrice(
      oldPlan,
      oldBillingCycle,
    );
    // Ensure oldPricePerUserAdjusted is a number
    const oldPricePerUserAdjusted = parseFloat(String(oldPricePerUserAdjustedRaw)) || 0;

    // Use new billing cycle for new plan pricing (charge calculation)
    // If newBillingCycle is provided, use it; otherwise use oldBillingCycle
    const targetBillingCycle = newBillingCycle || oldBillingCycle;
    const newPricePerUserRaw = this.pricingCalculationService.getPlanPrice(
      newPlan,
      targetBillingCycle,
    );
    // Ensure newPricePerUser is a number
    const newPricePerUser = parseFloat(String(newPricePerUserRaw)) || 0;

    // Calculate volume discounts for old and new user counts using centralized service
    const oldDiscount = this.pricingCalculationService.calculateVolumeDiscount(oldUserCount);
    const newDiscount = this.pricingCalculationService.calculateVolumeDiscount(newUserCount);

    const oldDiscountedPrice = oldPricePerUserAdjusted * (1 - oldDiscount / 100);
    const newDiscountedPrice = newPricePerUser * (1 - newDiscount / 100);

    // Calculate proration ratio
    const prorationRatio = daysRemaining / totalDaysInPeriod;

    // Credit for remaining days on old plan
    // If oldActualAmount is provided, use it to calculate prorated credit (accounts for previous payments)
    // Otherwise, calculate from plan pricing
    let creditAmount: number;
    let oldFullPeriodAmount: number;
    let creditCalculation: string;
    
    // Ensure oldActualAmount is a number
    const oldActualAmountNum = oldActualAmount ? parseFloat(String(oldActualAmount)) || 0 : 0;
    
    if (oldActualAmountNum > 0) {
      // Use actual amount paid, prorated for remaining days
      oldFullPeriodAmount = oldActualAmountNum;
      creditAmount = this.calculateProratedAmount(
        oldActualAmountNum,
        daysRemaining,
        totalDaysInPeriod,
      );
      creditCalculation = `Credit = (Actual Amount Paid: $${oldActualAmountNum.toFixed(2)}) × (Days Remaining: ${daysRemaining} / Total Days: ${totalDaysInPeriod}) = $${creditAmount.toFixed(2)}`;
    } else {
      // Calculate from plan pricing
      oldFullPeriodAmount = oldDiscountedPrice * oldUserCount;
      creditAmount = this.calculateProratedAmount(
        oldFullPeriodAmount,
        daysRemaining,
        totalDaysInPeriod,
      );
      creditCalculation = `Credit = (Old Plan: $${oldPricePerUserAdjusted.toFixed(2)}/user × ${oldUserCount} users × ${100 - oldDiscount}% discount = $${oldFullPeriodAmount.toFixed(2)}) × (${daysRemaining}/${totalDaysInPeriod}) = $${creditAmount.toFixed(2)}`;
    }

    // Charge for new plan - PRORATED for remaining days only
    // When upgrading, we charge only the prorated amount for the remaining days in the current period
    // The new subscription will start fresh from the next period, so we only charge for the remaining days now
    const newFullPeriodAmount = newDiscountedPrice * newUserCount;
    // Charge prorated amount for remaining days (not full period) because we're upgrading mid-cycle
    const chargeAmount = this.calculateProratedAmount(
      newFullPeriodAmount,
      daysRemaining,
      totalDaysInPeriod,
    );
    const chargeCalculation = `Charge = (New Plan: $${newPricePerUser.toFixed(2)}/user × ${newUserCount} users × ${100 - newDiscount}% discount = $${newFullPeriodAmount.toFixed(2)}) × (Days Remaining: ${daysRemaining} / Total Days: ${totalDaysInPeriod}) = $${chargeAmount.toFixed(2)} (Prorated for remaining days)`;

    const netCharge = chargeAmount - creditAmount;

    return {
      creditAmount: Math.round(creditAmount * 100) / 100,
      chargeAmount: Math.round(chargeAmount * 100) / 100,
      netCharge: Math.round(netCharge * 100) / 100,
      calculationDetails: {
        credit: {
          oldActualAmount: oldActualAmount && oldActualAmount > 0 ? oldActualAmount : undefined,
          oldPricePerUser: Math.round(oldPricePerUserAdjusted * 100) / 100,
          oldDiscountPercent: oldDiscount,
          oldDiscountedPricePerUser: Math.round(oldDiscountedPrice * 100) / 100,
          oldFullPeriodAmount: Math.round(oldFullPeriodAmount * 100) / 100,
          creditAmount: Math.round(creditAmount * 100) / 100,
          calculation: creditCalculation,
        },
        charge: {
          newPricePerUser: Math.round(newPricePerUser * 100) / 100,
          newDiscountPercent: newDiscount,
          newDiscountedPricePerUser: Math.round(newDiscountedPrice * 100) / 100,
          newFullPeriodAmount: Math.round(newFullPeriodAmount * 100) / 100,
          chargeAmount: Math.round(chargeAmount * 100) / 100,
          calculation: chargeCalculation,
        },
        period: {
          daysRemaining,
          totalDaysInPeriod,
          prorationRatio: Math.round(prorationRatio * 10000) / 10000, // 4 decimal places
        },
      },
    };
  }

  /**
   * Calculate combined upgrade charge (plan upgrade + user addition)
   * @param oldActualAmount - Optional: actual amount paid for old subscription
   */
  calculateCombinedUpgradeCharge(
    oldPlan: SubscriptionPlan,
    newPlan: SubscriptionPlan,
    oldUserCount: number,
    newUserCount: number,
    oldBillingCycle: BillingCycle,
    daysRemaining: number,
    totalDaysInPeriod: number,
    oldActualAmount?: number,
    newBillingCycle?: BillingCycle,
  ): {
    planUpgradeCharge: number;
    userAdditionCharge: number;
    totalCharge: number;
    creditAmount: number;
    chargeAmount: number;
    calculationDetails?: any;
  } {
    // Calculate plan upgrade charge
    const upgradeResult = this.calculatePlanUpgradeCharge(
      oldPlan,
      newPlan,
      oldUserCount,
      oldUserCount, // Use old user count for plan comparison
      oldBillingCycle,
      daysRemaining,
      totalDaysInPeriod,
      oldActualAmount, // Pass actual amount paid
      newBillingCycle, // Pass new billing cycle if changed
    );

    // Calculate user addition charge on new plan
    // Use new billing cycle if provided, otherwise use old billing cycle
    const targetBillingCycle = newBillingCycle || oldBillingCycle;
    const newPricePerUserRaw = this.pricingCalculationService.getPlanPrice(
      newPlan,
      targetBillingCycle,
    );
    // Ensure newPricePerUser is a number
    const newPricePerUser = parseFloat(String(newPricePerUserRaw)) || 0;

    // Calculate volume discount using centralized service
    const newDiscount = this.pricingCalculationService.calculateVolumeDiscount(newUserCount);
    const newDiscountedPrice = newPricePerUser * (1 - newDiscount / 100);

    // When plan changes, the subscription period resets to start from upgrade date
    // So charge FULL period for all users (not prorated), not just additional users
    // The credit above already accounts for the unused portion of the old subscription
    const newFullPeriodAmount = newDiscountedPrice * newUserCount;
    // Charge full period amount for all users (not prorated)
    const totalCharge = newFullPeriodAmount - upgradeResult.creditAmount;

    // Update calculation details to reflect full period charge for all users
    const updatedCalculationDetails = upgradeResult.calculationDetails ? {
      ...upgradeResult.calculationDetails,
      charge: {
        ...upgradeResult.calculationDetails.charge,
        newUserCount: newUserCount, // Update to show all users
        newFullPeriodAmount: Math.round(newFullPeriodAmount * 100) / 100,
        chargeAmount: Math.round(newFullPeriodAmount * 100) / 100,
        calculation: `Charge = New Plan: $${newPricePerUser.toFixed(2)}/user × ${newUserCount} users × ${100 - newDiscount}% discount = $${newFullPeriodAmount.toFixed(2)} (Full Period - not prorated)`,
      },
    } : undefined;

    return {
      planUpgradeCharge: upgradeResult.netCharge,
      userAdditionCharge: 0, // No separate user addition charge - all users charged at full period
      totalCharge: Math.round(totalCharge * 100) / 100,
      creditAmount: upgradeResult.creditAmount,
      chargeAmount: Math.round(newFullPeriodAmount * 100) / 100, // Full period charge for all users
      calculationDetails: updatedCalculationDetails,
    };
  }

  /**
   * Calculate plan downgrade credit (difference for remaining days)
   * Note: According to requirements, no credit for downgrade
   */
  calculatePlanDowngradeCredit(
    oldPlan: SubscriptionPlan,
    newPlan: SubscriptionPlan,
    userCount: number,
    billingCycle: BillingCycle,
    daysRemaining: number,
    totalDaysInPeriod: number,
  ): number {
    // No credit for downgrade - return 0
    return 0;
  }

  /**
   * Calculate billing cycle change charge/credit
   */
  calculateBillingCycleChangeCharge(
    oldCycle: BillingCycle,
    newCycle: BillingCycle,
    plan: SubscriptionPlan,
    userCount: number,
    daysRemaining: number,
    totalDaysInPeriod: number,
  ): {
    creditForOldCycle: number;
    chargeForNewCycle: number;
    netCharge: number;
  } {
    const oldPricePerUser = this.pricingCalculationService.getPlanPrice(plan, oldCycle);
    const newPricePerUser = this.pricingCalculationService.getPlanPrice(plan, newCycle);

    // Credit for remaining days in old cycle
    const creditForOldCycle = this.calculateProratedAmount(
      oldPricePerUser * userCount,
      daysRemaining,
      totalDaysInPeriod,
    );

    // Charge for new cycle
    let chargeForNewCycle = 0;
    if (newCycle === BillingCycle.YEARLY) {
      // Annual - charge full year
      chargeForNewCycle = newPricePerUser * userCount;
    } else {
      // Monthly - charge full month (prorated if mid-cycle, but typically starts new cycle)
      chargeForNewCycle = newPricePerUser * userCount;
    }

    const netCharge = chargeForNewCycle - creditForOldCycle;

    return {
      creditForOldCycle,
      chargeForNewCycle,
      netCharge,
    };
  }
}

