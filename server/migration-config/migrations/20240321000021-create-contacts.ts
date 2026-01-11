import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('contacts', {
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
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    company: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    job_title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    phone_encrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        'ACTIVE',
        'UNSUBSCRIBED',
        'BOUNCED',
        'COMPLAINED',
        'INACTIVE',
      ),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    subscribed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    subscribed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW(),
    },
    unsubscribed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    bounce_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    complaint_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    custom_fields: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    personal_notes_encrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    last_email_sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_email_opened_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_email_clicked_at: {
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
    // Extended Contact Fields - Only NEW fields that don't already exist
    timezone: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    email_verification_status: {
      type: DataTypes.ENUM('VERIFIED', 'UNVERIFIED', 'PENDING', 'FAILED'),
      allowNull: true,
      defaultValue: 'UNVERIFIED',
    },
    last_verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    email_verification_sub_status: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    outcome: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    creation_source: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    last_contacted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    number_of_opens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    number_of_clicks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    recently_open_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    recently_click_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    recently_reply_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    industry: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    experience: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    linkedin: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    twitter: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    facebook: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    website: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    company_domain: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    company_website: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    company_industry: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    company_size: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    company_revenue: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  });

  // Add unique constraint (composite unique on organization_id + email)
  try {
    await queryInterface.addIndex('contacts', ['organization_id', 'email'], {
      unique: true,
      name: 'unique_org_email',
    });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
    console.log('Index unique_org_email already exists, skipping');
  }

  try {
    await queryInterface.addIndex('contacts', ['organization_id', 'status'], {
      name: 'idx_contacts_status',
    });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
    console.log('Index idx_contacts_status already exists, skipping');
  }

  try {
    await queryInterface.addIndex('contacts', ['organization_id', 'updated_at'], {
      name: 'idx_contacts_updated',
    });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
    console.log('Index idx_contacts_updated already exists, skipping');
  }

  try {
    await queryInterface.addIndex('contacts', ['organization_id', 'source'], {
      name: 'idx_contacts_source',
    });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
    console.log('Index idx_contacts_source already exists, skipping');
  }

  // Add fulltext indexes for search
  try {
    await queryInterface.addIndex('contacts', ['first_name', 'last_name'], {
      type: 'FULLTEXT',
      name: 'ft_contacts_name',
    });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
    console.log('Index ft_contacts_name already exists, skipping');
  }

  try {
    await queryInterface.addIndex('contacts', ['email'], {
      type: 'FULLTEXT',
      name: 'ft_contacts_email',
    });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
    console.log('Index ft_contacts_email already exists, skipping');
  }

  // Add indexes for new extended fields
  try {
    await queryInterface.addIndex('contacts', ['organization_id', 'email_verification_status'], {
      name: 'idx_contacts_email_verification',
    });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
    console.log('Index idx_contacts_email_verification already exists, skipping');
  }

  try {
    await queryInterface.addIndex('contacts', ['organization_id', 'creation_source'], {
      name: 'idx_contacts_creation_source',
    });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
    console.log('Index idx_contacts_creation_source already exists, skipping');
  }

  try {
    await queryInterface.addIndex('contacts', ['organization_id', 'city', 'state', 'country'], {
      name: 'idx_contacts_location',
    });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
    console.log('Index idx_contacts_location already exists, skipping');
  }

  try {
    await queryInterface.addIndex('contacts', ['organization_id', 'company_industry'], {
      name: 'idx_contacts_company_industry',
    });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
    console.log('Index idx_contacts_company_industry already exists, skipping');
  }

  try {
    await queryInterface.addIndex('contacts', ['organization_id', 'last_contacted_at'], {
      name: 'idx_contacts_last_contacted',
    });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
    console.log('Index idx_contacts_last_contacted already exists, skipping');
  }
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.dropTable('contacts');
};
