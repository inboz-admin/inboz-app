import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('invoices', {
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
    subscription_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'subscriptions',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    // Invoice details
    invoice_number: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM(
        'DRAFT',
        'OPEN',
        'PAID',
        'VOID',
        'UNCOLLECTIBLE',
      ),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    // Amounts
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    tax_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    amount_paid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    amount_due: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.ENUM('USD', 'EUR', 'GBP'),
      allowNull: false,
      defaultValue: 'USD',
    },
    // Dates
    issue_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Billing information
    billing_address: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // External integration
    stripe_invoice_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    razorpay_payment_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    razorpay_order_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    razorpay_signature: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    payment_status: {
      type: DataTypes.ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'),
      allowNull: true,
    },
    // PDF generation
    pdf_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pdf_generated_at: {
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
  });

  // Add indexes
  await queryInterface.addIndex('invoices', ['organization_id'], {
    name: 'idx_invoices_org',
  });
  await queryInterface.addIndex('invoices', ['status', 'due_date'], {
    name: 'idx_invoices_status',
  });
  await queryInterface.addIndex('invoices', ['invoice_number'], {
    name: 'idx_invoices_number',
  });
  await queryInterface.addIndex('invoices', ['razorpay_payment_id'], {
    name: 'idx_invoices_razorpay_payment',
  });
  await queryInterface.addIndex('invoices', ['razorpay_order_id'], {
    name: 'idx_invoices_razorpay_order',
  });
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.dropTable('invoices');
};

