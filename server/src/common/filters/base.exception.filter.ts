import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { BaseResponse } from '../interfaces/base-response.interface';
import { Request, Response } from 'express';
import { ApiResponseMessage, ModuleNames } from '../enums/api.enum';
import { ErrorTypes } from '../enums/api.enum';
import { AppError, AppErrorResponse } from '../utils/error.handler';
import { LoggerService } from 'src/configuration/logger/logger.service';
import {
  ValidationError,
  UniqueConstraintError,
  DatabaseError,
  ConnectionError,
  TimeoutError,
} from 'sequelize';

@Catch()
export class BaseExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('ExceptionFilter');
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let responseBody: BaseResponse;

    if (exception instanceof NotFoundException) {
      responseBody = this.handleNotFound(exception, request);
    } else if (exception instanceof ConflictException) {
      responseBody = this.handleConflict(exception, request);
    } else if (exception instanceof AppError) {
      responseBody = this.handleAppError(exception, request);
    } else if (this.isNetworkError(exception)) {
      responseBody = this.handleNetworkError(exception, request);
    } else if (this.isSequelizeError(exception)) {
      responseBody = this.handleSequelizeError(exception, request);
    } else if (this.isValidationError(exception)) {
      responseBody = this.handleValidationError(exception, request);
    } else {
      responseBody = this.handleGenericError(exception, request);
    }

    return this.sendResponse(
      response,
      responseBody.statusCode,
      responseBody,
      request,
      exception,
    );
  }

  private handleAppError(exception: AppError, request: Request): BaseResponse {
    const errorResponse = exception.getResponse() as AppErrorResponse;
    return {
      success: false,
      statusCode: exception.getStatus(),
      message: errorResponse.message,
      module: this.getModuleFromPath(request.path),
      error: {
        type: errorResponse.type,
        code: errorResponse.errorCode,
        details: errorResponse.details,
      },
      timestamp: new Date().toISOString(),
      requestId: request.id,
    };
  }

  private handleAxiosError(exception: any, request: Request): BaseResponse {
    return {
      success: false,
      statusCode: exception.response?.status || HttpStatus.BAD_GATEWAY,
      message: 'External service error',
      module: this.getModuleFromPath(request.path),
      error: {
        type: ErrorTypes.TECHNICAL,
        code: 'EXTERNAL_SERVICE_ERROR',
        details: {
          message: exception.message,
          response: exception.response?.data,
          status: exception.response?.status,
        },
      },
      timestamp: new Date().toISOString(),
      requestId: request.id,
    };
  }

  private isValidationError(error: any): boolean {
    return (
      error?.name === 'BadRequestException' || error?.name === 'ValidationError'
    );
  }

  private handleValidationError(
    exception: any,
    request: Request,
  ): BaseResponse {
    const response = exception.response;

    return {
      success: false,
      statusCode: HttpStatus.BAD_REQUEST,
      message: response.message || ApiResponseMessage.VALIDATION_ERROR,
      module: this.getModuleFromPath(request.path),
      error: {
        type: ErrorTypes.VALIDATION,
        code: 'VALIDATION_ERROR',
        details: Array.isArray(response.details)
          ? response.details.map((detail: any) => ({
              field: detail.field,
              message: detail.message,
              value: detail.value,
            }))
          : response.message,
      },
      timestamp: new Date().toISOString(),
      requestId: request.id,
    };
  }

  private handleGenericError(exception: any, request: Request): BaseResponse {
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    return {
      success: false,
      statusCode: status,
      message: exception.message || 'Internal server error',
      module: this.getModuleFromPath(request.path),
      error: {
        type: ErrorTypes.TECHNICAL,
        code: exception.name || 'UNKNOWN_ERROR',
        details: exception.response?.message || exception.message,
      },
      timestamp: new Date().toISOString(),
      requestId: request.id,
    };
  }

  private isSequelizeError(error: any): boolean {
    return (
      error instanceof ValidationError ||
      error instanceof UniqueConstraintError ||
      error instanceof DatabaseError ||
      error instanceof ConnectionError ||
      error instanceof TimeoutError
    );
  }

  private handleSequelizeError(exception: any, request: Request): BaseResponse {
    let statusCode = HttpStatus.BAD_REQUEST;
    let message = 'Database operation failed';
    let errorType = ErrorTypes.DATABASE;
    let errorCode = 'DATABASE_ERROR';
    let details = null;

    if (exception instanceof UniqueConstraintError) {
      const field = exception.errors[0]?.path || 'field';
      message = `${field} already exists`;
      statusCode = HttpStatus.CONFLICT;
      errorCode = 'UNIQUE_CONSTRAINT_ERROR';
      details = exception.errors;
    } else if (exception instanceof ValidationError) {
      message = 'Validation error';
      errorType = ErrorTypes.VALIDATION;
      errorCode = 'VALIDATION_ERROR';
      details = exception.errors;
    } else if (exception instanceof ConnectionError) {
      message = 'Database connection error';
      statusCode = HttpStatus.SERVICE_UNAVAILABLE;
      errorType = ErrorTypes.TECHNICAL;
      errorCode = 'CONNECTION_ERROR';
    } else if (exception instanceof TimeoutError) {
      message = 'Database operation timed out';
      statusCode = HttpStatus.REQUEST_TIMEOUT;
      errorType = ErrorTypes.TECHNICAL;
      errorCode = 'TIMEOUT_ERROR';
    } else if (
      exception instanceof DatabaseError &&
      exception.name === 'SequelizeForeignKeyConstraintError'
    ) {
      message = 'Related record not found';
      statusCode = HttpStatus.BAD_REQUEST;
      errorType = ErrorTypes.VALIDATION;
      errorCode = 'FOREIGN_KEY_CONSTRAINT_ERROR';
    } else if (
      exception instanceof DatabaseError &&
      exception.name === 'SequelizeDatabaseError'
    ) {
      message = 'Schema violation';
      statusCode = HttpStatus.BAD_REQUEST;
      errorType = ErrorTypes.VALIDATION;
      errorCode = 'SCHEMA_VIOLATION_ERROR';
    } else {
      message = 'Database operation failed';
      statusCode = HttpStatus.BAD_REQUEST;
      errorType = ErrorTypes.DATABASE;
      errorCode = 'DATABASE_ERROR';
    }

    return {
      success: false,
      statusCode,
      message,
      module: this.getModuleFromPath(request.path),
      error: {
        type: errorType,
        code: errorCode,
        details,
      },
      timestamp: new Date().toISOString(),
      requestId: request.id,
    };
  }

  private isNetworkError(error: any): boolean {
    return (
      error instanceof Error &&
      'code' in error &&
      ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'].includes(error.code as string)
    );
  }

  private handleNetworkError(exception: any, request: Request): BaseResponse {
    return {
      success: false,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Network connectivity issue',
      module: this.getModuleFromPath(request.path),
      error: {
        type: ErrorTypes.TECHNICAL,
        code: 'NETWORK_ERROR',
        details: {
          code: exception.code,
          message: exception.message,
        },
      },
      timestamp: new Date().toISOString(),
      requestId: request.id,
    };
  }

  private sendResponse(
    response: Response,
    status: number,
    responseBody: BaseResponse,
    request: Request,
    exception: any,
  ) {
    this.logError(request, exception);
    return response.status(status).json(responseBody);
  }

  private logError(request: Request, exception: any) {
    // Get module from URL path
    const module = this.getModuleFromPath(request.path);

    // Create clean, structured log data matching the Logstash configuration
    const logData = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      event: this.getEventFromException(exception),
      message: exception.message,

      service: {
        name: 'nestjs-base',
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        hostname: require('os').hostname(),
        module: module,
      },

      request: {
        method: request.method,
        url: request.url,
        path: request.path,
        http_version: request.httpVersion || 'HTTP/1.1',
        id: request.id,
        ip: request.ip || request.connection?.remoteAddress,
        user_agent: request.headers['user-agent'],
        body_bytes: request.headers['content-length']
          ? parseInt(request.headers['content-length'])
          : 0,
        mime_type: request.headers['content-type'] || 'application/json',
        headers: this.sanitizeHeaders(request.headers),
      },

      error: {
        name: exception.name,
        code: this.getErrorCode(exception),
        type: this.getErrorType(exception),
        status_code: exception.getStatus?.() || 500,
        severity: this.getErrorSeverity(exception),
        stacktrace: exception.stack,
      },

      context: {
        pid: process.pid,
      },

      body: this.sanitizeRequestBody(request.body),
      query: request.query || {},
      params: request.params || {},
    };

    // Send to centralized logging - send the structured object directly
    this.logger.sendLogToCentralized('error', exception.message, logData);
  }

  private getEventFromException(exception: any): string {
    if (exception instanceof NotFoundException) return 'resource_not_found';
    if (exception instanceof ConflictException) return 'resource_conflict';
    if (exception instanceof UnauthorizedException)
      return 'authentication_failed';
    if (exception instanceof ForbiddenException) return 'authorization_failed';
    if (exception instanceof BadRequestException) return 'validation_failed';
    if (exception instanceof AppError) return 'application_error';
    if (this.isNetworkError(exception)) return 'network_error';
    if (this.isSequelizeError(exception)) return 'database_error';
    if (this.isValidationError(exception)) return 'validation_error';
    return 'unknown_error';
  }

  private getErrorCode(exception: any): string {
    if (exception instanceof AppError) {
      const errorResponse = exception.getResponse() as AppErrorResponse;
      return errorResponse.errorCode || 'APPLICATION_ERROR';
    }
    if (exception instanceof HttpException) {
      return exception.name;
    }
    return 'UNKNOWN_ERROR';
  }

  private getErrorType(exception: any): string {
    if (exception instanceof AppError) {
      const errorResponse = exception.getResponse() as AppErrorResponse;
      return errorResponse.type || 'TECHNICAL_ERROR';
    }
    if (exception instanceof HttpException) {
      return 'TECHNICAL_ERROR';
    }
    return 'TECHNICAL_ERROR';
  }

  private getErrorSeverity(exception: any): string {
    if (exception instanceof AppError) {
      // AppError doesn't have severity, so determine based on status code
      const statusCode = exception.getStatus?.() || 500;
      if (statusCode >= 500) return 'critical';
      if (statusCode >= 400) return 'high';
      return 'medium';
    }
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      if (statusCode >= 500) return 'critical';
      if (statusCode >= 400) return 'high';
      return 'medium';
    }
    return 'high';
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = {};
    for (const key in headers) {
      if (
        key.toLowerCase() !== 'authorization' &&
        key.toLowerCase() !== 'cookie'
      ) {
        sanitized[key] = headers[key];
      } else {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return {};
    if (typeof body === 'string') {
      try {
        return JSON.parse(body);
      } catch (e) {
        return { raw: body };
      }
    }
    try {
      return JSON.parse(JSON.stringify(body));
    } catch (e) {
      return { raw: body };
    }
  }

  private getModuleFromPath(path: string): ModuleNames {
    if (path.includes('/auth')) return ModuleNames.AUTH;
    if (path.includes('/todos')) return ModuleNames.TODO;
    if (path.includes('/users')) return ModuleNames.USER;
    if (path.includes('/rbac')) return ModuleNames.RBAC;
    if (path.includes('/organizations')) return ModuleNames.ORGANIZATION;
    if (path.includes('/employees')) return ModuleNames.EMPLOYEE;
    if (path.includes('/students')) return ModuleNames.STUDENT;
    if (path.includes('/courses')) return ModuleNames.COURSE;
    if (path.includes('/cohorts')) return ModuleNames.COHORT;
    if (path.includes('/classes')) return ModuleNames.CLASS;
    if (path.includes('/enrollments')) return ModuleNames.ENROLLMENT;
    if (path.includes('/enquiries')) return ModuleNames.ENQUIRY;
    if (path.includes('/feedbacks')) return ModuleNames.FEEDBACK;
    if (path.includes('/payments')) return ModuleNames.PAYMENT;
    if (path.includes('/expenses')) return ModuleNames.EXPENSE;
    if (path.includes('/audit-logs')) return ModuleNames.AUDIT_LOG;
    if (path.includes('/notifications')) return ModuleNames.NOTIFICATION;
    if (path.includes('/analytics')) return ModuleNames.ANALYTICS;
    if (path.includes('/worker')) return ModuleNames.WORKER;
    if (path.includes('/ws')) return ModuleNames.WS;
    if (path === '/') return ModuleNames.APP;
    return ModuleNames.APP;
  }

  private handleNotFound(
    exception: NotFoundException,
    request: Request,
  ): BaseResponse {
    return {
      success: false,
      statusCode: HttpStatus.NOT_FOUND,
      message: exception.message,
      module: this.getModuleFromPath(request.path),
      error: {
        type: ErrorTypes.BUSINESS,
        code: 'NOT_FOUND',
        details: exception.getResponse(),
      },
      timestamp: new Date().toISOString(),
      requestId: request.id,
    };
  }

  private handleConflict(
    exception: ConflictException,
    request: Request,
  ): BaseResponse {
    return {
      success: false,
      statusCode: HttpStatus.CONFLICT,
      message: exception.message,
      module: this.getModuleFromPath(request.path),
      error: {
        type: ErrorTypes.BUSINESS,
        code: 'CONFLICT',
        details: exception.getResponse(),
      },
      timestamp: new Date().toISOString(),
      requestId: request.id,
    };
  }
}
