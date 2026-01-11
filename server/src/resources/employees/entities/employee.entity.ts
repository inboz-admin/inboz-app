import {
  Table,
  Column,
  Model,
  DataType,
} from 'sequelize-typescript';
import { Exclude } from 'class-transformer';
import { BaseEntity } from 'src/common/entities/base.entity';
import { UserRole } from 'src/common/enums/roles.enum';

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Table({
  tableName: 'employees',
  timestamps: true,
  underscored: true,
  paranoid: true,
})
export class Employee extends BaseEntity {
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  email: string;

  @Exclude()
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
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
    type: DataType.ENUM(UserRole.SUPERADMIN, UserRole.SUPPORT),
    allowNull: false,
    defaultValue: UserRole.SUPPORT,
  })
  role: UserRole.SUPERADMIN | UserRole.SUPPORT;

  @Column({
    type: DataType.ENUM(...Object.values(EmployeeStatus)),
    allowNull: false,
    defaultValue: EmployeeStatus.ACTIVE,
  })
  status: EmployeeStatus;

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
}

