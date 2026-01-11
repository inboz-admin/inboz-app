import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('employees', {
      id: {
        type: DataTypes.CHAR(36),
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
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
        type: DataTypes.ENUM('SUPERADMIN', 'SUPPORT'),
        allowNull: false,
        defaultValue: 'SUPPORT',
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
    await queryInterface.addIndex('employees', ['email'], {
      name: 'idx_employees_email',
    });

    await queryInterface.addIndex('employees', ['status'], {
      name: 'idx_employees_status',
    });

    await queryInterface.addIndex('employees', ['role'], {
      name: 'idx_employees_role',
    });

    await queryInterface.addIndex('employees', ['last_login_at'], {
      name: 'idx_employees_last_login',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('employees');
  },
};


