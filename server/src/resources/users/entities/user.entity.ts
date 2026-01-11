import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Exclude } from 'class-transformer';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { UserRole } from 'src/common/enums/roles.enum';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Table({
  tableName: 'users',
  timestamps: true,
  underscored: true,
  paranoid: true,
})
export class User extends BaseEntity {
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

  @Exclude()
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  passwordHash: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  firstName: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  lastName: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  avatarUrl: string;

  @Column({
    type: DataType.ENUM(UserRole.USER, UserRole.ADMIN),
    allowNull: false,
    defaultValue: UserRole.USER,
  })
  role: UserRole.USER | UserRole.ADMIN;

  @Column({
    type: DataType.ENUM(...Object.values(UserStatus)),
    allowNull: false,
    defaultValue: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastLoginAt: Date;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  settings: any;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  socialProvider: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    unique: true,
  })
  socialId: string;

  @BelongsTo(() => Organization)
  organization: Organization;
}
