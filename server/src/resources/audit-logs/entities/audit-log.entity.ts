import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  READ = 'READ',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  SYSTEM = 'SYSTEM',
  CONVERSION = 'CONVERSION',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
}

@Table({
  tableName: 'audit_logs',
  timestamps: true,
  underscored: true,
  paranoid: true, // Enable soft deletes
})
export class AuditLog extends BaseEntity {
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: 'organization_id',
  })
  organizationId: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: 'performed_by_user_id',
  })
  performedByUserId: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  module: string;

  @Column({
    type: DataType.ENUM(...Object.values(AuditAction)),
    allowNull: false,
    defaultValue: AuditAction.SYSTEM,
  })
  action: AuditAction;

  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: 'record_id',
  })
  recordId: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  details: any;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    field: 'event_timestamp',
  })
  eventTimestamp: Date;

  // Associations
  @BelongsTo(() => User)
  performedByUser: User;
}
