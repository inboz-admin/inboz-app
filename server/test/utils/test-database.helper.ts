import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize';

/**
 * Test Database Helper
 * 
 * Provides utilities for database setup, teardown, and test isolation
 */

let testSequelize: Sequelize | null = null;

/**
 * Initialize test database connection (SQLite in-memory for fast tests)
 */
export async function initializeTestDatabase(): Promise<Sequelize> {
  if (testSequelize) {
    return testSequelize;
  }

  // Use SQLite in-memory database for fast unit/integration tests
  testSequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false, // Disable SQL logging in tests
    models: [], // Models will be added by test setup
  });

  await testSequelize.authenticate();
  return testSequelize;
}

/**
 * Close test database connection
 */
export async function closeTestDatabase(): Promise<void> {
  if (testSequelize) {
    try {
      await testSequelize.close();
    } catch (error) {
      // Ignore close errors - connection might already be closed
    }
    testSequelize = null;
  }
}

/**
 * Sync database schema (create tables)
 */
export async function syncTestDatabase(models: any[]): Promise<void> {
  if (!testSequelize) {
    await initializeTestDatabase();
  }

  if (testSequelize) {
    testSequelize.addModels(models);
    await testSequelize.sync({ force: true });
  }
}

/**
 * Clear all tables (useful for test cleanup)
 */
export async function clearTestDatabase(): Promise<void> {
  if (!testSequelize) {
    return;
  }

  // Get all models
  const models = testSequelize.models;

  // Delete all records from each table
  for (const model of Object.values(models)) {
    await model.destroy({ where: {}, force: true });
  }
}

/**
 * Create a test transaction for test isolation
 */
export async function createTestTransaction(): Promise<Transaction> {
  if (!testSequelize) {
    await initializeTestDatabase();
  }

  if (!testSequelize) {
    throw new Error('Test database not initialized');
  }

  return await testSequelize.transaction();
}

/**
 * Rollback a test transaction
 */
export async function rollbackTestTransaction(transaction: Transaction): Promise<void> {
  await transaction.rollback();
}

/**
 * Get test database instance
 */
export function getTestDatabase(): Sequelize | null {
  return testSequelize;
}

