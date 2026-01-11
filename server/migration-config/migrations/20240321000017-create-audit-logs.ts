import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: DataTypes.CHAR(36),
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      organization_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      performed_by_user_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      module: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      action: {
        type: DataTypes.ENUM(
          'CREATE',
          'UPDATE',
          'DELETE',
          'READ',
          'LOGIN',
          'LOGOUT',
          'SYSTEM',
          'CONVERSION',
          'EXPORT',
          'IMPORT',
        ),
        allowNull: false,
        defaultValue: 'SYSTEM',
      },
      record_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      details: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      event_timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW(),
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

    // Add indexes as specified in the original SQL
    await queryInterface.addIndex('audit_logs', ['organization_id'], {
      name: 'general_audit_logs_idx_organization_id',
    });

    await queryInterface.addIndex('audit_logs', ['performed_by_user_id'], {
      name: 'general_audit_logs_idx_performed_by_user_id',
    });

    await queryInterface.addIndex('audit_logs', ['module'], {
      name: 'general_audit_logs_idx_module',
    });

    await queryInterface.addIndex('audit_logs', ['action'], {
      name: 'general_audit_logs_idx_action',
    });

    await queryInterface.addIndex('audit_logs', ['record_id'], {
      name: 'general_audit_logs_idx_record_id',
    });

    await queryInterface.addIndex('audit_logs', ['event_timestamp'], {
      name: 'general_audit_logs_idx_event_timestamp',
    });

    // Add foreign key constraints
    await queryInterface.addConstraint('audit_logs', {
      fields: ['organization_id'],
      type: 'foreign key',
      name: 'audit_logs_fk_organization_id',
      references: {
        table: 'organizations',
        field: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('audit_logs', {
      fields: ['performed_by_user_id'],
      type: 'foreign key',
      name: 'audit_logs_fk_performed_by_user_id',
      references: {
        table: 'users',
        field: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('audit_logs');
  },
};
