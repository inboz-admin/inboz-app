import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { Campaign } from './campaign.entity';
import { CampaignStep } from './campaign-step.entity';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import { EmailTrackingEvent } from './email-tracking-event.entity';

export enum EmailMessageStatus {
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  BOUNCED = 'BOUNCED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum BounceType {
  HARD = 'HARD',
  SOFT = 'SOFT',
  BLOCK = 'BLOCK',
  SPAM = 'SPAM',
}

@Table({
  tableName: 'email_messages',
  timestamps: true,
  underscored: true,
  paranoid: true,
})
export class EmailMessage extends BaseEntity {
  @ForeignKey(() => Organization)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  organizationId: string;

  @ForeignKey(() => Campaign)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
  })
  campaignId: string;

  @ForeignKey(() => CampaignStep)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: 'campaign_step',
  })
  campaignStepId: string;

  @ForeignKey(() => Contact)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  contactId: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  gmailMessageId: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  gmailThreadId: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  replyMessageId: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  sentFromEmail: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: false,
  })
  subject: string;

  @Column({
    type: DataType.TEXT('long'),
    allowNull: true,
  })
  htmlContent: string;

  @Column({
    type: DataType.TEXT('long'),
    allowNull: true,
  })
  textContent: string;

  @Column({
    type: DataType.ENUM(...Object.values(EmailMessageStatus)),
    allowNull: false,
    defaultValue: EmailMessageStatus.QUEUED,
  })
  status: EmailMessageStatus;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  queuedAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'scheduled_send_at',
  })
  scheduledSendAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  sentAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  deliveredAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  openedAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  firstOpenedAt: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  openCount: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastOpenedAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  clickedAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  firstClickedAt: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  clickCount: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastClickedAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  bouncedAt: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  bounceReason: string;

  @Column({
    type: DataType.ENUM(...Object.values(BounceType)),
    allowNull: true,
  })
  bounceType: BounceType;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  complainedAt: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  complaintFeedback: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  unsubscribedAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  repliedAt: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  replyCount: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastRepliedAt: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  retryCount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 3,
  })
  maxRetries: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  nextRetryAt: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  errorMessage: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  errorCode: string;

  @BelongsTo(() => Organization)
  organization: Organization;

  @BelongsTo(() => Campaign)
  campaign: Campaign;

  @BelongsTo(() => CampaignStep)
  campaignStep: CampaignStep;

  @BelongsTo(() => Contact)
  contact: Contact;

  @HasMany(() => EmailTrackingEvent)
  trackingEvents: EmailTrackingEvent[];
}

