import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { BaseEntity } from 'src/common/entities/base.entity';
import { EmailMessage } from './email-message.entity';

export enum EmailEventType {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  OPENED = 'OPENED',
  CLICKED = 'CLICKED',
  BOUNCED = 'BOUNCED',
  COMPLAINED = 'COMPLAINED',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
  SPAM = 'SPAM',
  REPLIED = 'REPLIED',
}

export enum DeviceType {
  DESKTOP = 'DESKTOP',
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
  UNKNOWN = 'UNKNOWN',
}

@Table({
  tableName: 'email_tracking_events',
  timestamps: false,
  underscored: true,
})
export class EmailTrackingEvent extends Model {
  @Column({
    type: DataType.CHAR(36),
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @ForeignKey(() => EmailMessage)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  emailMessageId: string;

  @Column({
    type: DataType.ENUM(...Object.values(EmailEventType)),
    allowNull: false,
  })
  eventType: EmailEventType;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  eventData: any;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  userAgent: string;

  @Column({
    type: DataType.STRING(45),
    allowNull: true,
  })
  ipAddress: string;

  @Column({
    type: DataType.CHAR(2),
    allowNull: true,
  })
  country: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  city: string;

  @Column({
    type: DataType.ENUM(...Object.values(DeviceType)),
    allowNull: true,
  })
  deviceType: DeviceType;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  emailClient: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  clickedUrl: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  linkId: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  occurredAt: Date;

  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
  })
  trackingId: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  gmailMessageId: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  createdAt: Date;

  @BelongsTo(() => EmailMessage)
  emailMessage: EmailMessage;
}

