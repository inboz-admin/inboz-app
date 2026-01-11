import { Injectable, Logger } from '@nestjs/common';
import { Transaction, Sequelize } from 'sequelize';
import { Sequelize as SequelizeType } from 'sequelize-typescript';

/**
 * Transaction Manager Service
 *
 * Provides centralized transaction management with consistent error handling,
 * rollback logic, and isolation level configuration.
 *
 * Eliminates code duplication across services and ensures atomic operations.
 */
@Injectable()
export class TransactionManager {
  private readonly logger = new Logger(TransactionManager.name);

  constructor(private readonly sequelize: SequelizeType) {}

  /**
   * Execute an operation within a database transaction
   * @param operation - The operation to execute within the transaction
   * @param isolationLevel - Optional transaction isolation level
   * @returns The result of the operation
   */
  async execute<T>(
    operation: (transaction: Transaction) => Promise<T>,
    isolationLevel?: Transaction.ISOLATION_LEVELS
  ): Promise<T> {
    const transaction = await this.sequelize.transaction({
      isolationLevel: isolationLevel || Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });

    try {
      this.logger.debug('Starting database transaction');

      const result = await operation(transaction);

      await transaction.commit();
      this.logger.debug('Transaction committed successfully');

      return result;
    } catch (error) {
      this.logger.error('Transaction failed, rolling back', error);

      try {
        await transaction.rollback();
        this.logger.debug('Transaction rolled back successfully');
      } catch (rollbackError) {
        this.logger.error('Failed to rollback transaction', rollbackError);
      }

      throw error;
    }
  }

  /**
   * Execute multiple operations in sequence within a single transaction
   * @param operations - Array of operations to execute
   * @param isolationLevel - Optional transaction isolation level
   * @returns Array of operation results
   */
  async executeSequential<T>(
    operations: ((transaction: Transaction) => Promise<T>)[],
    isolationLevel?: Transaction.ISOLATION_LEVELS
  ): Promise<T[]> {
    return this.execute(async (transaction) => {
      const results: T[] = [];

      for (const operation of operations) {
        const result = await operation(transaction);
        results.push(result);
      }

      return results;
    }, isolationLevel);
  }

  /**
   * Execute operations with custom isolation level for high-concurrency scenarios
   * @param operation - The operation to execute
   * @returns The result of the operation
   */
  async executeSerializable<T>(
    operation: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    return this.execute(operation, Transaction.ISOLATION_LEVELS.SERIALIZABLE);
  }

  /**
   * Execute read-only operations with appropriate isolation level
   * @param operation - The read operation to execute
   * @returns The result of the operation
   */
  async executeReadOnly<T>(
    operation: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    return this.execute(operation, Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED);
  }
}
