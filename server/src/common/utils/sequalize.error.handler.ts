import { HttpStatus } from '@nestjs/common';
import {
  ValidationError,
  UniqueConstraintError,
  DatabaseError,
} from 'sequelize';
import { ModuleNames, ErrorTypes } from '../enums/api.enum';
import { LoggerService } from '@nestjs/common';
import { AppError } from './error.handler';

interface SequelizeOriginalError extends Error {
  original?: {
    detail?: string;
    [key: string]: any;
  };
}

export class SequelizeErrorHandler {
  constructor(private logger: LoggerService) {}

  handle(
    error: any,
    operation: string,
    context: any = {},
    module: ModuleNames = ModuleNames.APP,
  ) {
    // If it's already an AppError, just rethrow it
    if (error instanceof AppError) {
      throw error;
    }

    this.logger.error(
      `Database operation failed: ${operation}`,
      error?.stack,
      context,
    );

    // Handle Unique Constraint Violations
    if (error instanceof UniqueConstraintError) {
      const field = error.errors[0]?.path || 'field';
      throw new AppError(
        `${field} already exists`,
        module,
        HttpStatus.CONFLICT,
        'UNIQUE_CONSTRAINT_ERROR',
        ErrorTypes.BUSINESS,
        error.errors,
      );
    }

    // Handle Validation Errors
    if (error instanceof ValidationError) {
      throw new AppError(
        'Validation error',
        module,
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        ErrorTypes.VALIDATION,
        error.errors,
      );
    }

    // Handle Foreign Key Violations
    if (
      error instanceof DatabaseError &&
      error.name === 'SequelizeForeignKeyConstraintError'
    ) {
      throw new AppError(
        'Related record not found',
        module,
        HttpStatus.BAD_REQUEST,
        'FOREIGN_KEY_ERROR',
        ErrorTypes.DATABASE,
        { detail: (error.original as any)?.detail },
      );
    }

    // Handle Field Violations
    if (
      error instanceof DatabaseError &&
      error.name === 'SequelizeDatabaseError'
    ) {
      throw new AppError(
        'Schema violation',
        module,
        HttpStatus.BAD_REQUEST,
        'SCHEMA_ERROR',
        ErrorTypes.DATABASE,
        { message: (error.original as any)?.sqlMessage },
      );
    }

    // Handle Connection Errors
    if (error.name === 'SequelizeConnectionError') {
      throw new AppError(
        'Database connection error',
        module,
        HttpStatus.SERVICE_UNAVAILABLE,
        'CONNECTION_ERROR',
        ErrorTypes.TECHNICAL,
      );
    }

    // Handle Timeout Errors
    if (error.name === 'SequelizeTimeoutError') {
      throw new AppError(
        'Database operation timed out',
        module,
        HttpStatus.REQUEST_TIMEOUT,
        'TIMEOUT_ERROR',
        ErrorTypes.TECHNICAL,
      );
    }

    // Handle all other database errors
    const sequelizeError = error as SequelizeOriginalError;
    throw new AppError(
      'Database operation failed',
      module,
      HttpStatus.BAD_REQUEST,
      'DATABASE_ERROR',
      ErrorTypes.TECHNICAL,
      { detail: sequelizeError.original?.detail },
    );
  }

  handleNotFound<T>(
    result: T | null,
    entity: string,
    identifier: any,
    module: ModuleNames = ModuleNames.APP,
  ): T {
    if (!result) {
      throw new AppError(
        `${entity} not found`,
        module,
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        ErrorTypes.BUSINESS,
        { identifier },
      );
    }
    return result;
  }
}
