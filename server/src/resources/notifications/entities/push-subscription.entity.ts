import {
  Table,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { User } from 'src/resources/users/entities/user.entity';

@Table({
  tableName: 'push_subscriptions',
  timestamps: true,
  underscored: true,
  paranoid: true,
})
export class PushSubscription extends BaseEntity {
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
    type: DataType.STRING(500),
    allowNull: false,
  })
  endpoint: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  p256dhKey: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  authKey: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  userAgent: string | null;

  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => Organization)
  organization: Organization;
}

