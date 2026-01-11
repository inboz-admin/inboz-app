import { Column, Table, DataType } from 'sequelize-typescript';
import { BaseEntity } from 'src/common/entities/base.entity';
import { PermissionStructure } from 'src/common/interfaces/rbac.interface';

@Table({
  tableName: 'roles',
  timestamps: true,
  underscored: true,
  paranoid: true, // Enable soft deletes
})
export class Role extends BaseEntity {
  @Column({
    unique: true,
    allowNull: false,
  })
  name: string;

  @Column({
    allowNull: true,
  })
  description: string;

  @Column({ type: DataType.JSON })
  permissions: PermissionStructure; // Type-safe permission structure
}
