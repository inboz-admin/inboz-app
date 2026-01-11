import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('users', {
      id: {
        type: DataTypes.CHAR(36),
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
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
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      first_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      last_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      avatar_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM('USER', 'ADMIN'),
        allowNull: false,
        defaultValue: 'USER',
      },
      status: {
        type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      settings: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      // Social authentication fields
      social_provider: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      social_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
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
    await queryInterface.addIndex('users', ['organization_id'], {
      name: 'idx_users_org',
    });

    await queryInterface.addIndex('users', ['email'], {
      name: 'idx_users_email',
    });

    await queryInterface.addIndex('users', ['organization_id', 'status'], {
      name: 'idx_users_status',
    });

    await queryInterface.addIndex('users', ['organization_id', 'role'], {
      name: 'idx_users_role',
    });

    await queryInterface.addIndex('users', ['last_login_at'], {
      name: 'idx_users_last_login',
    });

    // Add unique constraint for organization_id and email combination
    await queryInterface.addConstraint('users', {
      fields: ['organization_id', 'email'],
      type: 'unique',
      name: 'unique_user_org',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('users');
  },
};
