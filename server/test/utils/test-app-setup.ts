import { INestApplication, ValidationPipe, ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BaseExceptionFilter } from 'src/common/filters/base.exception.filter';
import { LoggerService } from 'src/configuration/logger/logger.service';
import { validationConfig } from 'src/common/enums/validation.enum';
import { SuccessInterceptor } from 'src/common/interceptors/success.interceptor';
import { JwtAuthGuard } from 'src/configuration/jwt/jwt.auth.guard';
import * as express from 'express';

/**
 * Setup test application with the same configuration as production
 * This ensures E2E tests behave the same way as the real application
 */
export async function setupTestApp(app: INestApplication): Promise<void> {
  // FORCE test database configuration - override any values that might have been loaded
  // This is critical because ConfigModule might have loaded .env files with dev database settings
  if (process.env.NODE_ENV === 'test') {
    // Force override - don't use || operator, always set these values
    process.env.DB_NAME = 'email_tool_test';
    process.env.DB_USERNAME = 'sam1';
    process.env.DB_PASSWORD = 'sam123';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '3306';
    
    // Verify the database name is correct (for debugging)
    if (process.env.DB_NAME !== 'email_tool_test') {
      throw new Error(
        `Test database configuration error: Expected DB_NAME='email_tool_test' but got '${process.env.DB_NAME}'. ` +
        `Make sure test-setup.ts is executed before app initialization.`
      );
    }
  }

  // Suppress all logging in E2E tests
  jest.spyOn(Logger.prototype, 'log').mockImplementation();
  jest.spyOn(Logger.prototype, 'error').mockImplementation();
  jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  jest.spyOn(Logger.prototype, 'verbose').mockImplementation();
  
  // Suppress console output
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any;

  const logger = app.get(LoggerService);
  const reflector = app.get(Reflector);

  // Enable CORS - allow all origins in tests
  app.enableCors({
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
    ],
    exposedHeaders: ['X-Request-ID'],
  });

  // Configure Global Validation Pipe - CRITICAL for DTO validation
  app.useGlobalPipes(new ValidationPipe(validationConfig));

  // Set up the global exception filter
  app.useGlobalFilters(new BaseExceptionFilter(logger));

  // Apply the ClassSerializerInterceptor globally
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  // Apply the SuccessInterceptor globally
  app.useGlobalInterceptors(new SuccessInterceptor());

  // Apply JWT Auth Guard globally (respects @Public() decorator)
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // Increase the limit for JSON payloads
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(express.json({ limit: '10mb' }));
  expressApp.use(
    express.urlencoded({
      limit: '10mb',
      extended: true,
      parameterLimit: 50000,
    }),
  );
}

