import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { BaseExceptionFilter } from './common/filters/base.exception.filter';
import { LoggerService } from './configuration/logger/logger.service';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { validationConfig } from './common/enums/validation.enum';
import { ConfigService } from '@nestjs/config';
import { SuccessInterceptor } from './common/interceptors/success.interceptor';
import { UserContextInterceptor } from './common/interceptors/user-context.interceptor';
import { UserContextService } from './common/services/user-context.service';
import { join } from 'path';
import * as express from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './configuration/jwt/jwt.auth.guard';
import { BullBoardService } from './configuration/bull/services/bull-board.service';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Get the required services from the application context
  const logger = app.get(LoggerService);
  const configService = app.get(ConfigService);
  const bullBoardService = app.get(BullBoardService);
  const reflector = app.get(Reflector);

  const corsOrigins = configService.get('ALLOWED_ORIGINS')?.split(',') || [
    'http://localhost:4000',
    'http://localhost:3000',
    'http://inboz.io',
    'https://inboz.io',
  ];

  // Configure CORS
  app.enableCors({
    origin: corsOrigins,
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
    maxAge: 3600,
  });

  // Configure Socket.IO adapter
  app.useWebSocketAdapter(new IoAdapter(app));
  logger.log('🔌 Socket.IO adapter configured');

  // Configure Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe(validationConfig));

  // Set up the global exception filter
  app.useGlobalFilters(new BaseExceptionFilter(logger));

  // Apply the ClassSerializerInterceptor globally to enable @Exclude() decorator
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));


  // Apply the SuccessInterceptor globally
  app.useGlobalInterceptors(new SuccessInterceptor());

  app.useGlobalGuards(new JwtAuthGuard(new Reflector()));

  // Configure raw body parsing for webhook endpoints BEFORE express.json()
  // This must be done at Express level to capture raw body for signature verification
  const rawBodyParser = express.raw({ type: 'application/json', limit: '10mb' });
  
  app.use('/api/v1/payments/stripe/webhook', rawBodyParser, (req, res, next) => {
    (req as any).rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    next();
  });

  app.use('/api/v1/payments/razorpay/webhook', rawBodyParser, (req, res, next) => {
    (req as any).rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    next();
  });

  // Increase the limit for JSON payloads (for non-webhook routes)
  // Skip JSON parsing for webhook routes (they already have raw body)
  app.use((req, res, next) => {
    if (req.path.includes('/webhook')) {
      return next(); // Skip JSON parsing for webhooks
    }
    return express.json({ limit: '10mb' })(req, res, next);
  });
  app.use(
    express.urlencoded({
      limit: '10mb',
      extended: true,
      parameterLimit: 50000,
    }),
  );

  app.useStaticAssets(join(__dirname, '..', 'public/browser'));

  // Mount Bull Board
  app.use('/admin/queues', bullBoardService.getRouter());
  logger.log('📊 Bull Board Dashboard mounted at: /admin/queues');

  await app.listen(configService.get('PORT') || 4000, '0.0.0.0');
  logger.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap().catch((error) => {
  console.error('Application failed to start:', error.message);
  process.exit(1);
});
