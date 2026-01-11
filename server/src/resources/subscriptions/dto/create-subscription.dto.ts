import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsUUID,
  Min,
} from 'class-validator';
import { SubscriptionStatus, BillingCycle, Currency } from '../entities/subscription.entity';

export class CreateSubscriptionDto {
  @IsNotEmpty()
  @IsUUID()
  organizationId: string;

  @IsNotEmpty()
  @IsUUID()
  planId: string;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  // Per-user pricing fields
  @IsOptional()
  @IsNumber()
  @Min(0)
  userCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  volumeDiscountPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  finalAmount?: number;

  // Billing dates
  @IsOptional()
  @IsDateString()
  currentPeriodStart?: string;

  @IsOptional()
  @IsDateString()
  currentPeriodEnd?: string;

  @IsOptional()
  @IsDateString()
  trialStart?: string;

  @IsOptional()
  @IsDateString()
  trialEnd?: string;

  // Cancellation
  @IsOptional()
  @IsDateString()
  cancelAt?: string;

  @IsOptional()
  @IsDateString()
  cancelledAt?: string;

  @IsOptional()
  @IsString()
  cancelReason?: string;

  // External billing system integration
  @IsOptional()
  @IsString()
  stripeSubscriptionId?: string;

  @IsOptional()
  @IsString()
  stripeCustomerId?: string;
}



























