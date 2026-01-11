require('dotenv').config();

// For test environment, force test database settings even if .env file has different values
if (process.env.NODE_ENV === 'test') {
  process.env.DB_NAME = 'email_tool_test';
  process.env.DB_USERNAME = process.env.DB_USERNAME || 'sam1';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'sam123';
  process.env.DB_HOST = process.env.DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.DB_PORT || 3306;
}

var config = {
  development: {
    username: process.env.DB_USERNAME || 'sam1',
    password: process.env.DB_PASSWORD || 'sam123',
    database: process.env.DB_NAME || 'email_tool',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    dialectOptions: {
      bigNumberStrings: true
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
          },
      define: {
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
        paranoid: true
      },
      logging: false,
      seederStorage: 'sequelize',
      seederStorageTableName: 'SequelizeData'
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    dialectOptions: {
      bigNumberStrings: true,
      ssl: {
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 25,
      min: 5,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      paranoid: true
    },
    logging: false,
    seederStorage: 'sequelize',
    seederStorageTableName: 'SequelizeData'
  },
  prod: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    dialectOptions: {
      bigNumberStrings: true,
      ssl: {
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 25,
      min: 5,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      paranoid: true
    },
    logging: false,
    seederStorage: 'sequelize',
    seederStorageTableName: 'SequelizeData'
  },
  test: {
    username: process.env.DB_USERNAME || 'sam1',
    password: process.env.DB_PASSWORD || 'sam123',
    database: process.env.DB_NAME || 'email_tool_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    dialectOptions: {
      bigNumberStrings: true
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      paranoid: true
    },
    logging: false,
    seederStorage: 'sequelize',
    seederStorageTableName: 'SequelizeData'
  }
};

module.exports = config;

