import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('system_templates', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    variables: {
      type: DataTypes.JSON,
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

  // Add indexes (with error handling for existing indexes)
  try {
    await queryInterface.addIndex('system_templates', ['category'], {
      name: 'idx_system_templates_category',
    });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
  }

  try {
    await queryInterface.addIndex('system_templates', ['name'], {
      name: 'idx_system_templates_name',
    });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
  }
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.dropTable('system_templates');
};

