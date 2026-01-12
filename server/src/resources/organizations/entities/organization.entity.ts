import { Table, Column, Model, DataType } from 'sequelize-typescript';
import { BaseEntity } from 'src/common/entities/base.entity';

@Table({
  tableName: 'organizations',
  timestamps: true,
  underscored: true,
  paranoid: true,
})
export class Organization extends BaseEntity {
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  name: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
  })
  slug: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  domain: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    defaultValue: 'UTC',
  })
  timezone: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  settings: object;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  billingEmail: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  website: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  logoUrl: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  address: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  city: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  state: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  country: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  postalCode: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  phone: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  email: string;

  @Column({
    type: DataType.ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED'),
    allowNull: false,
    defaultValue: 'ACTIVE',
  })
  status: string;

  isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  canBeDeleted(): boolean {
    if (this.status !== 'INACTIVE') return false;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const updatedAt = new Date(this.updatedAt);
    if (updatedAt > thirtyDaysAgo) return false;

    return true;
  }

  updateSettings(newSettings: Partial<Record<string, any>>): Organization {
    this.settings = { ...this.settings, ...newSettings };
    return this;
  }

  canBeSuspended(): boolean {
    return this.status !== 'SUSPENDED';
  }

  getDisplayName(): string {
    return this.name || this.slug;
  }

  hasBillingInfo(): boolean {
    return !!(this.billingEmail || this.email);
  }

  getPrimaryEmail(): string | null {
    return this.billingEmail || this.email || null;
  }

  hasCompleteAddress(): boolean {
    return !!(this.address && this.city && this.state && this.country && this.postalCode);
  }

  getFullAddress(): string {
    if (!this.hasCompleteAddress()) return '';

    return `${this.address}, ${this.city}, ${this.state} ${this.postalCode}, ${this.country}`;
  }
}
