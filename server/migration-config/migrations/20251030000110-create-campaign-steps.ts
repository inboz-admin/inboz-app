import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('campaign_steps', {
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
    campaign_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: { model: 'campaigns', key: 'id' },
      onDelete: 'CASCADE',
    },
    step_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    template_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: { model: 'email_templates', key: 'id' },
      onDelete: 'SET NULL',
    },
    // Simplified: step is template-based only
    trigger_type: {
      type: DataTypes.ENUM('IMMEDIATE', 'SCHEDULE'),
      allowNull: false,
      defaultValue: 'IMMEDIATE',
    },
    schedule_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    delay_minutes: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.5,
      comment: 'Delay in minutes between each email sent in this step (supports decimals, e.g., 0.5 = 30 seconds)',
    },
    timezone: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'UTC',
      comment: 'Timezone for day boundaries and scheduling calculations (IANA timezone string)',
    },
    reply_to_step_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: { model: 'campaign_steps', key: 'id' },
      onDelete: 'SET NULL',
      comment: 'If set, this step will only send to contacts who opened or clicked from this previous step',
    },
    reply_type: {
      type: DataTypes.ENUM('OPENED', 'CLICKED'),
      allowNull: true,
      comment: 'Type of reply filtering: OPENED (only opened, no clicks/replies), CLICKED (only clicked, no replies)',
    },
    // Analytics fields
    emails_sent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    emails_delivered: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    emails_opened: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    emails_clicked: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    emails_bounced: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    emails_failed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    emails_cancelled: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    emails_complained: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    emails_replied: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    unsubscribes: {
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

  await queryInterface.addIndex('campaign_steps', ['campaign_id', 'step_order'], { name: 'idx_campaign_steps_campaign_order' });
  await queryInterface.addIndex('campaign_steps', ['organization_id'], { name: 'idx_campaign_steps_org' });
  await queryInterface.addIndex('campaign_steps', ['reply_to_step_id'], { name: 'idx_campaign_steps_reply_to' });
  await queryInterface.addIndex('campaign_steps', ['campaign_id', 'trigger_type', 'schedule_time'], { name: 'idx_campaign_steps_scheduling' });
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.dropTable('campaign_steps');
};


