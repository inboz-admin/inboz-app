import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('gmail_oauth_tokens', {
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
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      access_token_encrypted: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      refresh_token_encrypted: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      token_expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      scopes: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      granted_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW(),
      },
      daily_quota_used: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      quota_reset_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW(),
      },
      consent_given_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW(),
      },
      consent_version: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: '1.0',
      },
      data_retention_until: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW(),
      },
      status: {
        type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'REVOKED', 'INVALID'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      last_used_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      last_history_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Gmail historyId for incremental processing',
      },
      revoked_at: {
        type: DataTypes.DATE,
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
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    });

    // Add indexes
    await queryInterface.addIndex(
      'gmail_oauth_tokens',
      ['user_id', 'organization_id'],
      {
        name: 'idx_gmail_tokens_user',
      },
    );

    await queryInterface.addIndex('gmail_oauth_tokens', ['email'], {
      name: 'idx_gmail_tokens_email',
    });

    await queryInterface.addIndex(
      'gmail_oauth_tokens',
      ['status', 'revoked_at'],
      {
        name: 'idx_gmail_tokens_status',
      },
    );

    await queryInterface.addIndex(
      'gmail_oauth_tokens',
      ['quota_reset_at', 'daily_quota_used'],
      {
        name: 'idx_gmail_tokens_quota',
      },
    );

    // Add unique constraint for user_id and email combination
    await queryInterface.addConstraint('gmail_oauth_tokens', {
      fields: ['user_id', 'email'],
      type: 'unique',
      name: 'unique_user_email',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('gmail_oauth_tokens');
  },
};
