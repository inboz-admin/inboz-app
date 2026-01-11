import { Injectable } from '@nestjs/common';
import { BillingCycle } from '../entities/subscription.entity';

/**
 * Period Calculation Service
 * 
 * Provides centralized period end date calculation to eliminate code duplication.
 */
@Injectable()
export class PeriodCalculationService {
  /**
   * Calculate period end date based on billing cycle
   * @param startDate - The start date of the period
   * @param billingCycle - The billing cycle (MONTHLY or YEARLY)
   * @returns The end date of the period
   */
  calculatePeriodEnd(startDate: Date, billingCycle: BillingCycle): Date {
    const endDate = new Date(startDate);
    if (billingCycle === BillingCycle.YEARLY) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }
    return endDate;
  }
}


