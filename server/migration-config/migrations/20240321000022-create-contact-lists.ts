import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('contact_lists', {
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    filter_conditions: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    contact_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    type: {
      type: DataTypes.ENUM('PRIVATE', 'PUBLIC'),
      allowNull: false,
      defaultValue: 'PRIVATE',
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
    updated_by: {
      type: DataTypes.CHAR(36),
      allowNull: true,
    },
    deleted_by: {
      type: DataTypes.CHAR(36),
      allowNull: true,
    },
  });

  // Add unique constraint for organization_id + name (check if exists first)
  try {
    await queryInterface.addIndex('contact_lists', ['organization_id', 'name'], {
      unique: true,
      name: 'unique_org_list_name',
    });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
    console.log('Index unique_org_list_name already exists, skipping');
  }

  // Add indexes
  try {
    await queryInterface.addIndex('contact_lists', ['organization_id'], {
      name: 'idx_contact_lists_org',
    });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
    console.log('Index idx_contact_lists_org already exists, skipping');
  }

  // Add index on type column for filtering
  try {
    await queryInterface.addIndex('contact_lists', ['type'], {
      name: 'idx_contact_lists_type',
    });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
    console.log('Index idx_contact_lists_type already exists, skipping');
  }

  // Add composite index for organization and type
  try {
    await queryInterface.addIndex('contact_lists', ['organization_id', 'type'], {
      name: 'idx_contact_lists_org_type',
    });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
    console.log('Index idx_contact_lists_org_type already exists, skipping');
  }

  // Add fulltext index for search
  try {
    await queryInterface.addIndex('contact_lists', ['name'], {
      type: 'FULLTEXT',
      name: 'ft_contact_lists_name',
    });
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name')) {
      throw error;
    }
    console.log('Index ft_contact_lists_name already exists, skipping');
  }
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.dropTable('contact_lists');
};
