import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LoggerService } from './logger.service';
import { Public } from '../jwt/public.decorator';

interface LogRequest {
  level: 'info' | 'error' | 'warn' | 'debug' | 'verbose';
  message: string;
  meta?: any;
}

@Controller('logging')
export class LoggerController {
  constructor(private readonly loggerService: LoggerService) {
    this.loggerService.setContext('LoggerController');
  }

  @Public()
  @Get('config')
  getLoggingConfig() {
    return {
      success: true,
      data: this.loggerService.getLoggingConfig(),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendLog(@Body() logRequest: LogRequest) {
    try {
      await this.loggerService.sendLogToCentralized(
        logRequest.level,
        logRequest.message,
        logRequest.meta,
      );

      return {
        success: true,
        message: 'Log sent to centralized service successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.loggerService.error(
        'Failed to send log to centralized service',
        error.stack,
        {
          logRequest,
        },
      );

      return {
        success: false,
        message: 'Failed to send log to centralized service',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Public()
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testCentralizedLogging() {
    const testLogs = [
      {
        level: 'info',
        message: 'Test info log from centralized logging system',
      },
      {
        level: 'warn',
        message: 'Test warning log from centralized logging system',
      },
      {
        level: 'error',
        message: 'Test error log from centralized logging system',
      },
      {
        level: 'debug',
        message: 'Test debug log from centralized logging system',
      },
    ];

    const results = [];

    for (const testLog of testLogs) {
      try {
        await this.loggerService.sendLogToCentralized(
          testLog.level,
          testLog.message,
          { test: true, timestamp: new Date().toISOString() },
        );
        results.push({
          level: testLog.level,
          status: 'success',
        });
      } catch (error: any) {
        results.push({
          level: testLog.level,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return {
      success: true,
      message: 'Centralized logging test completed',
      results,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health')
  async getLoggingHealth() {
    const config = this.loggerService.getLoggingConfig();

    return {
      success: true,
      data: {
        status: 'healthy',
        centralizedLogging: {
          elasticsearch: config.elasticsearch,
          customEndpoint: config.customEndpoint,
          additionalEndpoints: config.additionalEndpoints,
        },
        logLevel: config.level,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
