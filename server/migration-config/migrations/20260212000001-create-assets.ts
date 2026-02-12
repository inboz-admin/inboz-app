import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('assets', {
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
    url: {
      type: DataTypes.STRING(2048),
      allowNull: false,
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    originalname: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    mimetype: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING(50),
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

  try {
    await queryInterface.addIndex(
      'assets',
      ['organization_id', 'deleted_at'],
      { name: 'idx_assets_org' }
    );
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name') && !error.message?.includes('already exists')) {
      throw error;
    }
  }

  try {
    await queryInterface.addIndex(
      'assets',
      ['organization_id', 'created_by', 'deleted_at'],
      { name: 'idx_assets_org_user' }
    );
  } catch (error: any) {
    if (!error.message?.includes('Duplicate key name') && !error.message?.includes('already exists')) {
      throw error;
    }
  }
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.dropTable('assets');
};
