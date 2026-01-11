import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { Subscription } from './subscription.entity';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  PAID = 'PAID',
  VOID = 'VOID',
  UNCOLLECTIBLE = 'UNCOLLECTIBLE',
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

@Table({
  tableName: 'invoices',
  timestamps: true,
  underscored: true,
})
export class Invoice extends Model {
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

  @ForeignKey(() => Subscription)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
  })
  subscriptionId: string;

  // Invoice details
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
  })
  invoiceNumber: string;

  @Column({
    type: DataType.ENUM(...Object.values(InvoiceStatus)),
    allowNull: false,
    defaultValue: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  // Amounts
  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  subtotal: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  taxAmount: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  total: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  amountPaid: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  amountDue: number;

  @Column({
    type: DataType.ENUM(...Object.values(Currency)),
    allowNull: false,
    defaultValue: Currency.USD,
  })
  currency: Currency;

  // Dates
  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  issueDate: Date;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  dueDate: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  paidAt: Date;

  // Billing information
  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  billingAddress: any;

  // External integration
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  stripeInvoiceId: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  razorpayPaymentId: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  razorpayOrderId: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  razorpaySignature: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  paymentMethod: string;

  @Column({
    type: DataType.ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'),
    allowNull: true,
    defaultValue: 'PENDING',
  })
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

  // PDF generation
  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  pdfUrl: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  pdfGeneratedAt: Date;

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

  @BelongsTo(() => Subscription)
  subscription: Subscription;
}

