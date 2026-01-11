import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from './user.entity';
import { Organization } from 'src/resources/organizations/entities/organization.entity';

export enum GmailTokenStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  INVALID = 'INVALID',
}

@Table({
  tableName: 'gmail_oauth_tokens',
  timestamps: true,
  underscored: true,
  paranoid: false,
  deletedAt: false,
})
export class GmailOAuthToken extends BaseEntity {
  @ForeignKey(() => User)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  userId: string;

  @ForeignKey(() => Organization)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  organizationId: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  email: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  accessTokenEncrypted: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  refreshTokenEncrypted: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  tokenExpiresAt: Date;

  @Column({
    type: DataType.JSON,
    allowNull: false,
  })
  scopes: string[];

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  grantedAt: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  dailyQuotaUsed: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  quotaResetAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  consentGivenAt: Date;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: '1.0',
  })
  consentVersion: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  dataRetentionUntil: Date;

  @Column({
    type: DataType.ENUM(...Object.values(GmailTokenStatus)),
    allowNull: false,
    defaultValue: GmailTokenStatus.ACTIVE,
  })
  status: GmailTokenStatus;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastUsedAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  revokedAt: Date;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Gmail historyId for incremental processing',
  })
  lastHistoryId: string;

  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => Organization)
  organization: Organization;
}
