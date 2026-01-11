import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerService } from './logger.service';
import { LoggerInterceptor } from './logger.interceptor';
import { LoggerController } from './logger.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [LoggerController],
  providers: [
    LoggerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerInterceptor,
    },
  ],
  exports: [LoggerService],
})
export class LoggerModule {}
