import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('selection_sessions', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      allowNull: false,
    },
    list_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'contact_lists',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    original_selection: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Array of contact IDs that were in the original list',
    },
    current_selection: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Array of contact IDs currently selected',
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Session expires after 30 minutes',
    },
    // BaseEntity columns
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    created_by: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      defaultValue: null,
    },
    updated_by: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      defaultValue: null,
    },
    deleted_by: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      defaultValue: null,
    },
  });

  // Add indexes for performance
  await queryInterface.addIndex('selection_sessions', ['list_id']);
  await queryInterface.addIndex('selection_sessions', ['user_id']);
  await queryInterface.addIndex('selection_sessions', ['expires_at']);
  await queryInterface.addIndex('selection_sessions', ['user_id', 'list_id']);
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.dropTable('selection_sessions');
};
