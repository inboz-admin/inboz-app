import {
  Table,
  Column,
  Model,
  DataType,
  Index,
} from 'sequelize-typescript';

@Table({
  tableName: 'system_templates',
  timestamps: true,
  underscored: true,
  paranoid: false, // System templates are not soft-deleted
  indexes: [
    {
      name: 'idx_system_templates_category',
      fields: ['category'],
    },
    {
      name: 'idx_system_templates_name',
      fields: ['name'],
    },
  ],
})
export class SystemTemplate extends Model {
  @Column({
    type: DataType.CHAR(36),
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  category: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: false,
  })
  subject: string;

  @Column({
    type: DataType.TEXT('long'),
    allowNull: false,
  })
  htmlContent: string;

  @Column({
    type: DataType.TEXT('long'),
    allowNull: true,
  })
  textContent: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  variables: string[];

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    field: 'created_at',
  })
  createdAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    field: 'updated_at',
  })
  updatedAt: Date;
}

