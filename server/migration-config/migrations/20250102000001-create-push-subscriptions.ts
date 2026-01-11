import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    // Drop table if it exists (from failed migration)
    const tableExists = await queryInterface.tableExists('push_subscriptions');
    if (tableExists) {
      await queryInterface.dropTable('push_subscriptions');
    }
    
    await queryInterface.createTable('push_subscriptions', {
      id: {
        type: DataTypes.CHAR(36),
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      user_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      organization_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: {
          model: 'organizations',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      endpoint: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      p256dh_key: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      auth_key: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      user_agent: {
        type: DataTypes.STRING(500),
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

    // Add indexes (with error handling for existing indexes)
    try {
      await queryInterface.addIndex('push_subscriptions', ['user_id'], {
        name: 'idx_push_subscriptions_user',
      });
    } catch (error: any) {
      if (!error.message.includes('Duplicate key name')) {
        throw error;
      }
    }
    
    try {
      await queryInterface.addIndex('push_subscriptions', ['organization_id'], {
        name: 'idx_push_subscriptions_organization',
      });
    } catch (error: any) {
      if (!error.message.includes('Duplicate key name')) {
        throw error;
      }
    }
    
    try {
      await queryInterface.addIndex('push_subscriptions', ['endpoint'], {
        name: 'idx_push_subscriptions_endpoint',
      });
    } catch (error: any) {
      if (!error.message.includes('Duplicate key name')) {
        throw error;
      }
    }
    
    try {
      await queryInterface.addIndex('push_subscriptions', ['deleted_at'], {
        name: 'idx_push_subscriptions_deleted',
      });
    } catch (error: any) {
      if (!error.message.includes('Duplicate key name')) {
        throw error;
      }
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('push_subscriptions');
  },
};

