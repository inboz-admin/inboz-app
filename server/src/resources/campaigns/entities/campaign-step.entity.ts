import { Table, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Campaign } from './campaign.entity';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { EmailTemplate } from 'src/resources/email-templates/entities/email-template.entity';

@Table({
  tableName: 'campaign_steps',
  timestamps: true,
  underscored: true,
  paranoid: true,
})
export class CampaignStep extends BaseEntity {
  @ForeignKey(() => Organization)
  @Column({ type: DataType.CHAR(36), allowNull: false })
  organizationId: string;

  @ForeignKey(() => Campaign)
  @Column({ type: DataType.CHAR(36), allowNull: false })
  campaignId: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  stepOrder: number;

  @Column({ type: DataType.STRING(255), allowNull: true })
  name: string | null;

  @ForeignKey(() => EmailTemplate)
  @Column({ type: DataType.CHAR(36), allowNull: true })
  templateId: string | null;

  @Column({
    type: DataType.ENUM('IMMEDIATE', 'SCHEDULE'),
    allowNull: false,
    defaultValue: 'IMMEDIATE',
  })
  triggerType: 'IMMEDIATE' | 'SCHEDULE';

  @Column({ type: DataType.DATE, allowNull: true })
  scheduleTime: Date | null;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0.5 })
  delayMinutes: number;

  @Column({ type: DataType.STRING(100), allowNull: true, defaultValue: 'UTC' })
  timezone: string | null;

  @ForeignKey(() => CampaignStep)
  @Column({ type: DataType.CHAR(36), allowNull: true })
  replyToStepId: string | null;

  @Column({
    type: DataType.ENUM('OPENED', 'CLICKED', 'SENT'),
    allowNull: true,
  })
  replyType: 'OPENED' | 'CLICKED' | 'SENT' | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  emailsSent: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  emailsDelivered: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  emailsOpened: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  emailsClicked: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  emailsBounced: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  emailsFailed: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  emailsCancelled: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  emailsComplained: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  emailsReplied: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  unsubscribes: number;

  progressPercentage?: number;
  totalExpected?: number;
  emailsQueued?: number;
  emailsScheduled?: number;

  @BelongsTo(() => Campaign)
  campaign: Campaign;
}


