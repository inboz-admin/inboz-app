import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Global,
  Logger,
} from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { InjectConnection } from '@nestjs/sequelize';
import { IDatabaseQuery } from 'src/common/interfaces/database.query';
import { IStoredProcedure } from 'src/common/interfaces/database.sp';
import { Organization } from 'src/resources/organizations/entities/organization.entity';

@Global()
@Injectable()
export class DatabaseService
  implements OnModuleInit, OnModuleDestroy, IDatabaseQuery, IStoredProcedure
{
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    @InjectConnection()
    private readonly sequelize: Sequelize,
  ) {}

  async onModuleInit() {
    try {
      // Test the database connection
      await this.sequelize.authenticate();
      this.logger.log('Database connection established successfully');

      // Note: Model synchronization is handled by the DatabaseModule configuration
      // with autoLoadModels: true and synchronize: true

      // Log available models
      const modelNames = Object.keys(this.sequelize.models);
      this.logger.log(`Database models loaded: ${modelNames.join(', ')}`);

      // Verify all expected models are loaded
      const expectedModels = [
        'User',
        'Role',
        'Resource',
        'Action',
        'Organization',
        'Employee',
      ];
      const missingModels = expectedModels.filter(
        (model) => !modelNames.includes(model),
      );

      if (missingModels.length > 0) {
        this.logger.warn(`Missing models: ${missingModels.join(', ')}`);
      } else {
        this.logger.log('All expected models are properly loaded');
      }
    } catch (error) {
      this.logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.sequelize.close(); // Close the connection pool
      this.logger.log('Database connection closed.');
    } catch (error) {
      this.logger.error('Error closing database connection:', error);
    }
  }

  // For raw queries
  async query<T = any>(sql: string, params?: any[]): Promise<T> {
    try {
      const [results] = await this.sequelize.query(sql, {
        replacements: params,
      });
      return results as T;
    } catch (error: any) {
      this.logger.error(`Error executing query: ${sql}`, error);
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  // For stored procedures
  async callStoredProcedure<T = any>(
    procedureName: string,
    params?: any[],
  ): Promise<T> {
    const sql = `CALL ${procedureName}(${params?.map(() => '?').join(',')})`;
    try {
      const [results] = await this.sequelize.query(sql, {
        replacements: params,
      });
      return results as T;
    } catch (error: any) {
      this.logger.error(
        `Error calling stored procedure: ${procedureName}`,
        error,
      );
      throw new Error(`Stored procedure call failed: ${error.message}`);
    }
  }

  // For transactions
  async runInTransaction<T>(
    callback: (transaction: any) => Promise<T>,
  ): Promise<T> {
    const transaction = await this.sequelize.transaction();
    try {
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error: any) {
      await transaction.rollback();
      this.logger.error('Transaction failed, rolled back:', error);
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  // Health check
  async checkHealth(): Promise<boolean> {
    try {
      await this.sequelize.authenticate();
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  // Get Sequelize instance for ORM operations
  getSequelize(): Sequelize {
    return this.sequelize;
  }

  async getConnection(): Promise<Sequelize> {
    return this.sequelize;
  }
}
