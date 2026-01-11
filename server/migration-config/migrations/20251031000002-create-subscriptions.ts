import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('subscriptions', {
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
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    plan_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'subscription_plans',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    // Subscription details
    status: {
      type: DataTypes.ENUM(
        'ACTIVE',
        'CANCELLED',
        'PAST_DUE',
        'UNPAID',
        'INCOMPLETE',
        'TRIAL',
      ),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    billing_cycle: {
      type: DataTypes.ENUM('MONTHLY', 'YEARLY'),
      allowNull: false,
      defaultValue: 'MONTHLY',
    },
    // Pricing
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    // Per-user pricing fields (new billing model)
    user_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    volume_discount_percent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    final_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    proration_details: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Stores proration details including creditAmount, chargeAmount, and adjustment information',
    },
    currency: {
      type: DataTypes.ENUM('USD', 'EUR', 'GBP'),
      allowNull: false,
      defaultValue: 'USD',
    },
    // Billing dates
    current_period_start: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    current_period_end: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    trial_start: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    trial_end: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Cancellation
    cancel_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancel_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Pending changes (scheduled for next billing cycle)
    pending_user_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    pending_plan_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'subscription_plans',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    pending_change_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Payment provider
    payment_provider: {
      type: DataTypes.ENUM('RAZORPAY', 'STRIPE'),
      allowNull: true,
    },
    // External billing system integration
    stripe_subscription_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    stripe_customer_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    razorpay_subscription_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    razorpay_customer_id: {
      type: DataTypes.STRING(255),
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
  });

  // Add indexes
  await queryInterface.addIndex('subscriptions', ['organization_id'], {
    name: 'idx_subscriptions_org',
  });
  await queryInterface.addIndex('subscriptions', ['status'], {
    name: 'idx_subscriptions_status',
  });
  await queryInterface.addIndex('subscriptions', ['stripe_subscription_id'], {
    name: 'idx_subscriptions_stripe',
  });
  await queryInterface.addIndex('subscriptions', ['razorpay_subscription_id'], {
    name: 'idx_subscriptions_razorpay',
  });
  await queryInterface.addIndex('subscriptions', ['razorpay_customer_id'], {
    name: 'idx_subscriptions_razorpay_customer',
  });

  // Add composite index on (organization_id, status) to help prevent duplicate active subscriptions
  // This index helps with query performance and application-level race condition prevention
  // Note: MySQL doesn't support partial unique indexes directly, so we rely on:
  // 1. Application-level checks with transactions
  // 2. This composite index for query optimization
  // 3. Transaction isolation levels (REPEATABLE READ or SERIALIZABLE) for atomicity
  await queryInterface.addIndex('subscriptions', ['organization_id', 'status'], {
    name: 'idx_subscriptions_org_status',
    unique: false, // Not unique to allow multiple statuses per org, but helps with queries
  });
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.removeIndex('subscriptions', 'idx_subscriptions_org_status');
  await queryInterface.dropTable('subscriptions');
};

