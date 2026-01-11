import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { BaseEntity } from 'src/common/entities/base.entity';
import { ContactList } from 'src/resources/contact-lists/entities/contact-list.entity';
import { User } from 'src/resources/users/entities/user.entity';

@Table({
  tableName: 'selection_sessions',
  timestamps: true,
  underscored: true,
})
export class SelectionSession extends BaseEntity {
  @ForeignKey(() => ContactList)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  listId: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  userId: string;

  @Column({
    type: DataType.JSON,
    allowNull: false,
    comment: 'Array of contact IDs that were in the original list',
  })
  originalSelection: string[];

  @Column({
    type: DataType.JSON,
    allowNull: false,
    comment: 'Array of contact IDs currently selected',
  })
  currentSelection: string[];

  @Column({
    type: DataType.DATE,
    allowNull: false,
    comment: 'Session expires after 30 minutes',
  })
  expiresAt: Date;

  // Associations
  @BelongsTo(() => ContactList)
  contactList: ContactList;

  @BelongsTo(() => User)
  user: User;
}
