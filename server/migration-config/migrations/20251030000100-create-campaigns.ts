import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('campaigns', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    created_by: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    updated_by: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    deleted_by: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    organization_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: { model: 'organizations', key: 'id' },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    contact_list_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: { model: 'contact_lists', key: 'id' },
      onDelete: 'CASCADE',
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    sequence_settings: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    current_step: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    total_steps: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    tracking_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    open_tracking: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    click_tracking: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    unsubscribe_tracking: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    unsubscribe_reply_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    unsubscribe_custom_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    auto_advance: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    // analytics counters
    total_recipients: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    emails_sent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    emails_delivered: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    emails_opened: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    emails_clicked: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    emails_bounced: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    emails_failed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    emails_cancelled: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    emails_complained: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    emails_replied: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    unsubscribes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    compliance_checked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    compliance_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
  });

  await queryInterface.addIndex('campaigns', ['organization_id'], { name: 'idx_campaigns_org' });
  await queryInterface.addIndex('campaigns', ['organization_id', 'status'], { name: 'idx_campaigns_status' });
  await queryInterface.addIndex('campaigns', ['contact_list_id'], { name: 'idx_campaigns_contact_list' });
  await queryInterface.addIndex('campaigns', ['status', 'completed_at'], { name: 'idx_campaigns_status_completed' });
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.dropTable('campaigns');
};


