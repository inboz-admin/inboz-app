import { Table, Column, DataType, ForeignKey, HasMany, BelongsTo } from 'sequelize-typescript';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { CampaignStep } from './campaign-step.entity';
import { User } from 'src/resources/users/entities/user.entity';

@Table({
  tableName: 'campaigns',
  timestamps: true,
  underscored: true,
  paranoid: true,
})
export class Campaign extends BaseEntity {
  @ForeignKey(() => Organization)
  @Column({ type: DataType.CHAR(36), allowNull: false })
  organizationId: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  name: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description: string;

  @Column({ type: DataType.CHAR(36), allowNull: false })
  contactListId: string;

  @Column({
    type: DataType.ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED'),
    allowNull: false,
    defaultValue: 'DRAFT',
  })
  status:
    | 'DRAFT'
    | 'ACTIVE'
    | 'PAUSED'
    | 'CANCELLED'
    | 'COMPLETED';

  @Column({ type: DataType.JSON, allowNull: true })
  sequenceSettings: any;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 1 })
  currentStep: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 1 })
  totalSteps: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  trackingEnabled: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  openTracking: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  clickTracking: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  unsubscribeTracking: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  unsubscribeReplyEnabled: boolean;

  @Column({ type: DataType.TEXT, allowNull: true })
  unsubscribeCustomMessage: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  autoAdvance: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  complianceChecked: boolean;

  @Column({ type: DataType.TEXT, allowNull: true })
  complianceNotes: string;

  @Column({ type: DataType.DATE, allowNull: true })
  completedAt: Date;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  version: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  totalRecipients: number;

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
  totalExpectedEmails?: number;
  emailsCompleted?: number;
  emailsQueued?: number;
  emailsScheduled?: number;

  @BelongsTo(() => Organization)
  organization: Organization;

  @HasMany(() => CampaignStep)
  steps: CampaignStep[];

  @BelongsTo(() => User, 'createdBy')
  creator: User;
}


