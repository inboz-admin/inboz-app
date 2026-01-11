import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('email_tracking_events', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    email_message_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'email_messages',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    event_type: {
      type: DataTypes.ENUM(
        'SENT',
        'DELIVERED',
        'OPENED',
        'CLICKED',
        'BOUNCED',
        'COMPLAINED',
        'UNSUBSCRIBED',
        'SPAM',
        'REPLIED',
      ),
      allowNull: false,
    },
    event_data: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    country: {
      type: DataTypes.CHAR(2),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    device_type: {
      type: DataTypes.ENUM('DESKTOP', 'MOBILE', 'TABLET', 'UNKNOWN'),
      allowNull: true,
    },
    email_client: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    // Click-specific data
    clicked_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    link_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    // Timestamp
    occurred_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW(),
    },
    // Tracking pixel data
    tracking_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
    },
    // Gmail message ID for reply/bounce events to prevent duplicates
    gmail_message_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW(),
    },
  });

  // Indexes for performance
  await queryInterface.addIndex('email_tracking_events', ['email_message_id'], {
    name: 'idx_email_tracking_events_message',
  });

  await queryInterface.addIndex('email_tracking_events', ['event_type', 'occurred_at'], {
    name: 'idx_email_tracking_events_type_occurred',
  });

  await queryInterface.addIndex('email_tracking_events', ['tracking_id'], {
    name: 'idx_email_tracking_events_tracking',
  });

  // Unique index to prevent duplicate reply/bounce events for the same Gmail message
  // This ensures a Gmail message can only be counted once per email_message_id
  // Note: MySQL allows multiple NULL values in unique indexes, so NULL gmail_message_id values
  // won't conflict, but non-NULL values will be enforced as unique per (email_message_id, event_type)
  await queryInterface.addIndex(
    'email_tracking_events',
    ['email_message_id', 'event_type', 'gmail_message_id'],
    {
      name: 'idx_email_tracking_events_gmail_msg_unique',
      unique: true,
    },
  );

  // Index for querying by gmail_message_id
  await queryInterface.addIndex('email_tracking_events', ['gmail_message_id'], {
    name: 'idx_email_tracking_events_gmail_msg',
  });

  await queryInterface.addIndex('email_tracking_events', ['email_message_id', 'event_type'], {
    name: 'idx_email_tracking_events_message_type',
  });
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.dropTable('email_tracking_events');
};

