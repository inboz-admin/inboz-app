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
import { NotificationType } from 'src/common/enums/notification-type.enum';

@Table({
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
  paranoid: true,
})
export class Notification extends BaseEntity {
  @ForeignKey(() => Organization)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  organizationId: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
  })
  userId: string | null;

  @Column({
    type: DataType.ENUM(...Object.values(NotificationType)),
    allowNull: false,
  })
  type: NotificationType;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  title: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  message: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  data: any;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  readAt: Date | null;

  @ForeignKey(() => User)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
  })
  readBy: string | null;

  @BelongsTo(() => Organization)
  organization: Organization;

  @BelongsTo(() => User, 'userId')
  user: User;

  @BelongsTo(() => User, 'readBy')
  readByUser: User;
}

