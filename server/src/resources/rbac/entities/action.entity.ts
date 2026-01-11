import { Column, Table } from 'sequelize-typescript';
import { BaseEntity } from 'src/common/entities/base.entity';

@Table({
  tableName: 'actions',
  timestamps: true,
  underscored: true,
  paranoid: true, // Enable soft deletes
})
export class Action extends BaseEntity {
  @Column({
    unique: true,
    allowNull: false,
  })
  name: string;

  @Column({
    allowNull: true,
  })
  description: string;
}
