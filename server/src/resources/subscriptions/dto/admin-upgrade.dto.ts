import { IsNotEmpty, IsUUID, IsInt, Min, IsOptional, IsEnum } from 'class-validator';
import { BillingCycle } from '../entities/subscription.entity';

export class AdminUpgradeSubscriptionDto {
  @IsNotEmpty()
  @IsUUID()
  organizationId: string;

  @IsNotEmpty()
  @IsUUID()
  planId: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  userCount: number;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;
}

export class AdminUpdateUserCountDto {
  @IsNotEmpty()
  @IsUUID()
  organizationId: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  userCount: number;
}
