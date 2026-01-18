import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('email_templates', {
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
    name: {
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
    plain_text: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('PUBLIC', 'PRIVATE'),
      allowNull: false,
      defaultValue: 'PRIVATE',
    },
    send_format: {
      type: DataTypes.ENUM('HTML', 'TEXT'),
      allowNull: false,
      defaultValue: 'TEXT',
    },
    variables: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    design_settings: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    usage_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    parent_template_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'email_templates',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    // System tracking fields
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
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
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

  // Add indexes (with error handling for existing indexes)
  try {
  await queryInterface.addIndex('email_templates', ['organization_id'], {
    name: 'idx_email_templates_org',
  });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
  }

  try {
  await queryInterface.addIndex('email_templates', ['organization_id', 'category'], {
    name: 'idx_email_templates_category',
  });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
  }

  try {
  await queryInterface.addIndex('email_templates', ['usage_count'], {
    name: 'idx_email_templates_usage',
  });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
  }

  // Composite index for access filter queries
  try {
  await queryInterface.addIndex('email_templates', ['organization_id', 'type', 'created_by', 'deleted_at'], {
    name: 'idx_email_templates_access',
  });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
  }

  // Add fulltext index for search
  try {
  await queryInterface.addIndex('email_templates', ['name'], {
    type: 'FULLTEXT',
    name: 'ft_email_templates_name',
  });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
  }
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.dropTable('email_templates');
};
