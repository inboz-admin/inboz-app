import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Organization } from 'src/resources/organizations/entities/organization.entity';

export enum ContactStatus {
  ACTIVE = 'ACTIVE',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
  BOUNCED = 'BOUNCED',
  COMPLAINED = 'COMPLAINED',
  INACTIVE = 'INACTIVE',
}

export enum EmailVerificationStatus {
  VERIFIED = 'VERIFIED',
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
}

@Table({
  tableName: 'contacts',
  timestamps: true,
  underscored: true,
  paranoid: true, // Enable soft deletes
})
export class Contact extends BaseEntity {
  @ForeignKey(() => Organization)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  organizationId: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: 'unique_org_email', // This matches the unique constraint in migration
  })
  email: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  firstName: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  lastName: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  company: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  jobTitle: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  phone: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  phoneEncrypted: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  source: string;

  @Column({
    type: DataType.ENUM(...Object.values(ContactStatus)),
    allowNull: false,
    defaultValue: ContactStatus.ACTIVE,
  })
  status: ContactStatus;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  subscribed: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  subscribedAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  unsubscribedAt: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  bounceCount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  complaintCount: number;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  customFields: any;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  personalNotesEncrypted: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastEmailSentAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastEmailOpenedAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastEmailClickedAt: Date;

  // Extended Contact Fields - Only NEW fields that don't already exist
  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  timezone: string;

  @Column({
    type: DataType.ENUM(...Object.values(EmailVerificationStatus)),
    allowNull: true,
    defaultValue: EmailVerificationStatus.UNVERIFIED,
  })
  emailVerificationStatus: EmailVerificationStatus;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastVerifiedAt: Date;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  emailVerificationSubStatus: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  outcome: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  creationSource: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastContactedAt: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  numberOfOpens: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  numberOfClicks: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  recentlyOpenDate: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  recentlyClickDate: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  recentlyReplyDate: Date;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  department: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  industry: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  experience: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  linkedin: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  twitter: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  facebook: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  website: string;

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
    type: DataType.STRING(255),
    allowNull: true,
  })
  companyDomain: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  companyWebsite: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  companyIndustry: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  companySize: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  companyRevenue: string;

  // Associations
  @BelongsTo(() => Organization)
  organization: Organization;
}
