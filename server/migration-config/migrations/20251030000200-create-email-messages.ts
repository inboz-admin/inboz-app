import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('email_messages', {
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
    campaign_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'campaigns',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    campaign_step: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'campaign_steps',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    contact_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'contacts',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    gmail_message_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Internal Gmail API message ID returned from send response (result.id). Format: "19a4f5a1a427cdbc"',
    },
    gmail_thread_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Gmail Thread ID. Used for threading emails in the same conversation via Gmail API threadId parameter.',
    },
    reply_message_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Clean Message-ID header from Gmail (fetched via getRealMessageId function, without < > brackets). Set when this email is a reply. Format: "19a4f5a1a427cdbc@mail.gmail.com"',
    },
    sent_from_email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    html_content: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    text_content: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        'QUEUED',
        'SENDING',
        'SENT',
        'DELIVERED',
        'BOUNCED',
        'FAILED',
        'CANCELLED',
      ),
      allowNull: false,
      defaultValue: 'QUEUED',
    },
    queued_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW(),
    },
    scheduled_send_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Scheduled send time when email job was created. This is when the email is planned to be sent.',
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Engagement tracking - opens
    opened_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    first_opened_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    open_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    last_opened_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Engagement tracking - clicks
    clicked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    first_clicked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    click_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    last_clicked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Bounce tracking
    bounced_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    bounce_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    bounce_type: {
      type: DataTypes.ENUM('HARD', 'SOFT', 'BLOCK', 'SPAM'),
      allowNull: true,
    },
    // Feedback
    complained_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    complaint_feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    unsubscribed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Reply tracking
    replied_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reply_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    last_replied_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Retry logic
    retry_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    max_retries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
    },
    next_retry_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Error handling
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    error_code: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    // Timestamps
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
    // Audit fields
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

  // Indexes for performance
  await queryInterface.addIndex('email_messages', ['organization_id'], {
    name: 'idx_email_messages_org',
  });

  await queryInterface.addIndex('email_messages', ['campaign_id'], {
    name: 'idx_email_messages_campaign',
  });

  await queryInterface.addIndex('email_messages', ['contact_id'], {
    name: 'idx_email_messages_contact',
  });

  await queryInterface.addIndex('email_messages', ['campaign_step'], {
    name: 'idx_email_messages_step',
  });

  await queryInterface.addIndex('email_messages', ['status', 'queued_at'], {
    name: 'idx_email_messages_status_queued',
  });

  await queryInterface.addIndex('email_messages', ['sent_at'], {
    name: 'idx_email_messages_sent',
  });

  await queryInterface.addIndex('email_messages', ['scheduled_send_at'], {
    name: 'idx_email_messages_scheduled_send_at',
  });

  await queryInterface.addIndex('email_messages', ['campaign_id', 'campaign_step'], {
    name: 'idx_email_messages_campaign_step',
  });

  await queryInterface.addIndex('email_messages', ['campaign_id', 'status'], {
    name: 'idx_email_messages_campaign_status',
  });

  await queryInterface.addIndex('email_messages', ['campaign_id', 'campaign_step', 'status'], {
    name: 'idx_email_messages_campaign_step_status',
  });
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.dropTable('email_messages');
};

