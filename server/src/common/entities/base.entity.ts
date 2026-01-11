import {
  Model,
  Column,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  DataType,
} from 'sequelize-typescript';

export class BaseEntity extends Model {
  @PrimaryKey
  @Column({
    type: DataType.CHAR(36),
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @CreatedAt
  @Column({
    type: DataType.DATE,
  })
  createdAt: string;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
  })
  updatedAt: string;

  @DeletedAt
  @Column({
    type: DataType.DATE,
    defaultValue: null,
  })
  deletedAt?: string;

  @Column({
    type: DataType.CHAR(36),
    defaultValue: null,
  })
  createdBy?: string;

  @Column({
    type: DataType.CHAR(36),
    defaultValue: null,
  })
  updatedBy?: string;

  @Column({
    type: DataType.CHAR(36),
    defaultValue: null,
  })
  deletedBy?: string;
}
