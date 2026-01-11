import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { SubscriptionPlan } from './subscription-plan.entity';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { PaymentProvider } from 'src/common/enums/payment-provider.enum';

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  PAST_DUE = 'PAST_DUE',
  UNPAID = 'UNPAID',
  INCOMPLETE = 'INCOMPLETE',
  TRIAL = 'TRIAL',
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

@Table({
  tableName: 'subscriptions',
  timestamps: true,
  underscored: true,
})
export class Subscription extends Model {
  @Column({
    type: DataType.CHAR(36),
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @ForeignKey(() => Organization)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  organizationId: string;

  @ForeignKey(() => SubscriptionPlan)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  planId: string;

  // Subscription details
  @Column({
    type: DataType.ENUM(...Object.values(SubscriptionStatus)),
    allowNull: false,
    defaultValue: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({
    type: DataType.ENUM(...Object.values(BillingCycle)),
    allowNull: false,
    defaultValue: BillingCycle.MONTHLY,
  })
  billingCycle: BillingCycle;

  // Pricing
  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  amount: number;

  @Column({
    type: DataType.ENUM(...Object.values(Currency)),
    allowNull: false,
    defaultValue: Currency.USD,
  })
  currency: Currency;

  // Per-user pricing fields
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  userCount: number;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true,
  })
  volumeDiscountPercent: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
  })
  finalAmount: number;

  // Proration and adjustments
  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  prorationDetails: any; // Stores creditAmount, chargeAmount, and other proration info

  // Billing dates
  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  currentPeriodStart: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  currentPeriodEnd: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  trialStart: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  trialEnd: Date;

  // Cancellation
  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  cancelAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  cancelledAt: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  cancelReason: string;

  // Pending changes (scheduled for next billing cycle)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  pendingUserCount: number;

  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
  })
  pendingPlanId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  pendingChangeReason: string;

  // Payment provider
  @Column({
    type: DataType.ENUM(...Object.values(PaymentProvider)),
    allowNull: true,
  })
  paymentProvider: PaymentProvider;

  // External billing system integration
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  stripeSubscriptionId: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  stripeCustomerId: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  razorpaySubscriptionId: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  razorpayCustomerId: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  createdAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  updatedAt: Date;

  // Associations
  @BelongsTo(() => Organization)
  organization: Organization;

  @BelongsTo(() => SubscriptionPlan)
  plan: SubscriptionPlan;
}

