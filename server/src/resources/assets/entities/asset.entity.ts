import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
} from 'sequelize-typescript';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { User } from 'src/resources/users/entities/user.entity';

@Table({
  tableName: 'assets',
  timestamps: true,
  underscored: true,
  paranoid: true,
  indexes: [
    {
      name: 'idx_assets_org_user',
      fields: ['organization_id', 'created_by', 'deleted_at'],
    },
    {
      name: 'idx_assets_org',
      fields: ['organization_id', 'deleted_at'],
    },
  ],
})
export class Asset extends BaseEntity {
  @ForeignKey(() => Organization)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  organizationId: string;

  @Column({
    type: DataType.STRING(2048),
    allowNull: false,
  })
  url: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  filename: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  originalname: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  mimetype: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  size: number;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  type: string;

  @BelongsTo(() => Organization)
  organization: Organization;

  @BelongsTo(() => User, 'createdBy')
  createdByUser: User;
}
