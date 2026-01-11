import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('contact_list_members', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    contact_list_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'contact_lists',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    contact_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'contacts',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    added_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW(),
    },
    added_by: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
  });

  // Add unique constraint
  await queryInterface.addIndex(
    'contact_list_members',
    ['contact_list_id', 'contact_id'],
    {
      unique: true,
      name: 'unique_list_contact',
    },
  );

  // Add indexes
  await queryInterface.addIndex('contact_list_members', ['contact_list_id'], {
    name: 'idx_contact_list_members_list',
  });

  await queryInterface.addIndex('contact_list_members', ['contact_id'], {
    name: 'idx_contact_list_members_contact',
  });
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.dropTable('contact_list_members');
};
