#!/usr/bin/env node

/**
 * Simple script to run Sequelize CLI commands with test database configuration
 * Usage: node scripts/test-db.js migrate|seed|migrate:undo:all|seed:undo:all
 */

// Set test environment variables BEFORE requiring any modules
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'email_tool_test';
process.env.DB_USERNAME = 'sam1';
process.env.DB_PASSWORD = 'sam123';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';

// Get the command from command line arguments
const command = process.argv[2];

// Map of allowed commands
const commands = {
  'migrate': 'db:migrate',
  'migrate:undo:all': 'db:migrate:undo:all',
  'seed': 'db:seed:all',
  'seed:undo:all': 'db:seed:undo:all',
};

if (!command || !commands[command]) {
  console.error('Usage: node scripts/test-db.js <command>');
  console.error('Commands: migrate, migrate:undo:all, seed, seed:undo:all');
  process.exit(1);
}

// Execute sequelize-cli command
const { execSync } = require('child_process');
const sequelizeCommand = `npx sequelize-cli ${commands[command]}`;

try {
  execSync(sequelizeCommand, { stdio: 'inherit' });
} catch (error) {
  process.exit(1);
}










