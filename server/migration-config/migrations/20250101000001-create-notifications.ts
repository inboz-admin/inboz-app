import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('notifications', {
      id: {
        type: DataTypes.CHAR(36),
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      organization_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
      },
      user_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      type: {
        type: DataTypes.ENUM(
          'CAMPAIGN_COMPLETED',
          'CAMPAIGN_STARTED',
          'CAMPAIGN_PAUSED',
          'CAMPAIGN_FAILED',
        ),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      data: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      read_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      read_by: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW(),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW(),
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      deleted_by: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
    });

    // Add indexes
    await queryInterface.addIndex('notifications', ['organization_id'], {
      name: 'notifications_idx_organization_id',
    });

    await queryInterface.addIndex('notifications', ['user_id'], {
      name: 'notifications_idx_user_id',
    });

    await queryInterface.addIndex('notifications', ['type'], {
      name: 'notifications_idx_type',
    });

    await queryInterface.addIndex('notifications', ['read_at'], {
      name: 'notifications_idx_read_at',
    });

    await queryInterface.addIndex('notifications', ['created_at'], {
      name: 'notifications_idx_created_at',
    });

    // Composite index for common query pattern: unread notifications for user
    await queryInterface.addIndex(
      'notifications',
      ['user_id', 'read_at', 'created_at'],
      {
        name: 'notifications_idx_user_read_created',
      },
    );

    // Add foreign key constraints
    await queryInterface.addConstraint('notifications', {
      fields: ['organization_id'],
      type: 'foreign key',
      name: 'notifications_fk_organization_id',
      references: {
        table: 'organizations',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('notifications', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'notifications_fk_user_id',
      references: {
        table: 'users',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('notifications', {
      fields: ['read_by'],
      type: 'foreign key',
      name: 'notifications_fk_read_by',
      references: {
        table: 'users',
        field: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('notifications');
  },
};

