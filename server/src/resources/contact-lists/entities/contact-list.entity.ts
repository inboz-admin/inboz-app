import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { User } from 'src/resources/users/entities/user.entity';
import { ContactListMember } from './contact-list-member.entity';
import { FilterConditions } from '../dto/filter-conditions.interface';
import { ContactListType } from '../enums/contact-list-type.enum';

@Table({
  tableName: 'contact_lists',
  timestamps: true,
  underscored: true,
  paranoid: true,
})
export class ContactList extends BaseEntity {
  @ForeignKey(() => Organization)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  organizationId: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: 'unique_org_list_name',
  })
  name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  filterConditions: FilterConditions | null;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  contactCount: number;

  @Column({
    type: DataType.ENUM(...Object.values(ContactListType)),
    allowNull: false,
    defaultValue: ContactListType.PRIVATE,
  })
  type: ContactListType;

  @BelongsTo(() => Organization)
  organization: Organization;

  @BelongsTo(() => User, 'createdBy')
  creator: User;

  @HasMany(() => ContactListMember)
  members: ContactListMember[];
}
