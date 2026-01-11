import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('subscription_plans', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Per-user pricing
    price_per_user_monthly: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    price_per_user_yearly: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    // Daily email limit
    daily_email_limit: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // Plan limits
    max_contacts: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    max_emails_per_month: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    max_campaigns: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    max_templates: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    max_users: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // Features
    features: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // Plan status
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
  });

  // Add indexes
  await queryInterface.addIndex('subscription_plans', ['is_active', 'is_public'], {
    name: 'idx_subscription_plans_active',
  });
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.dropTable('subscription_plans');
};



























