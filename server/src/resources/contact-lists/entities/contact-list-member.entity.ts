import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { ContactList } from './contact-list.entity';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import { User } from 'src/resources/users/entities/user.entity';

@Table({
  tableName: 'contact_list_members',
  timestamps: false,
  underscored: true,
})
export class ContactListMember extends Model {
  @Column({
    type: DataType.CHAR(36),
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @ForeignKey(() => ContactList)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  contactListId: string;

  @ForeignKey(() => Contact)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  contactId: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  addedAt: Date;

  @ForeignKey(() => User)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
  })
  addedBy: string;

  @BelongsTo(() => ContactList)
  contactList: ContactList;

  @BelongsTo(() => Contact)
  contact: Contact;

  @BelongsTo(() => User, 'addedBy')
  addedByUser: User;
}
