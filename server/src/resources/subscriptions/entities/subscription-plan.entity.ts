import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

@Table({
  tableName: 'subscription_plans',
  timestamps: true,
  underscored: true,
})
export class SubscriptionPlan extends Model {
  @Column({
    type: DataType.CHAR(36),
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  // Per-user pricing
  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
  })
  pricePerUserMonthly: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
  })
  pricePerUserYearly: number;

  // Plan limits
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  maxContacts: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  maxEmailsPerMonth: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  dailyEmailLimit: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  maxCampaigns: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  maxTemplates: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  maxUsers: number;

  // Features
  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  features: any;

  // Plan status
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  isActive: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  isPublic: boolean;

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
  @HasMany(() => require('./subscription.entity').Subscription)
  subscriptions: any[];
}



























