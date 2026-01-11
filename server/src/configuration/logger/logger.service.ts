import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as fs from 'fs';
import * as path from 'path';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;
  private context: string = '';
  private readonly configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;

    const printfFormat = winston.format.printf(
      ({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level}] [${this.context}]: ${message} ${JSON.stringify(meta)}`;
      },
    );

    // Create transports array - only console and centralized transports
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          printfFormat,
        ),
      }),
    ];

    // Add centralized logging transports based on configuration
    const centralizedTransports = this.createCentralizedTransports();
    transports.push(...centralizedTransports);

    this.logger = winston.createLogger({
      level: this.configService.get('LOG_LEVEL') || 'info',
      format: winston.format.combine(winston.format.timestamp(), printfFormat),
      transports,
    });
  }

  private createCentralizedTransports(): winston.transport[] {
    const transports: winston.transport[] = [];

    // ELK Stack (Elasticsearch) transport
    const elasticsearchUrl = this.configService.get('ELASTICSEARCH_URL');
    if (elasticsearchUrl) {
      try {
        const url = new URL(elasticsearchUrl);
        transports.push(
          new winston.transports.Http({
            host: url.hostname,
            port: Number(url.port) || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname || '/_bulk',
            ssl: url.protocol === 'https:',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
          }),
        );
      } catch (error) {
        console.warn('Invalid ELASTICSEARCH_URL:', elasticsearchUrl);
      }
    }

    // Custom HTTP endpoint transport
    const centralizedLogUrl = this.configService.get('CENTRALIZED_LOG_URL');
    if (centralizedLogUrl && centralizedLogUrl.trim() !== '') {
      try {
        const url = new URL(centralizedLogUrl);
        transports.push(
          new winston.transports.Http({
            host: url.hostname,
            port: Number(url.port) || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname,
            ssl: url.protocol === 'https:',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
          }),
        );
      } catch (error) {
        console.warn('Invalid CENTRALIZED_LOG_URL:', centralizedLogUrl);
      }
    }

    // Custom transport for any other centralized logging service
    const customLogEndpoint = this.configService.get('CUSTOM_LOG_ENDPOINT');
    if (customLogEndpoint && customLogEndpoint.trim() !== '') {
      try {
        const url = new URL(customLogEndpoint);
        transports.push(
          new winston.transports.Http({
            host: url.hostname,
            port: Number(url.port) || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname,
            ssl: url.protocol === 'https:',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
          }),
        );
      } catch (error) {
        console.warn('Invalid CUSTOM_LOG_ENDPOINT:', customLogEndpoint);
      }
    }

    return transports;
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, meta?: any) {
    const logData = this.formatLogData('info', message, meta);
    this.logger.info(message, logData);
    this.sendToCentralizedService('info', message, logData);
  }

  error(message: string, trace: string, meta?: any) {
    const logData = this.formatLogData('error', message, { ...meta, trace });
    this.logger.error(`${message} - ${trace}`, logData);
    this.sendToCentralizedService('error', message, logData);
  }

  warn(message: string, meta?: any) {
    const logData = this.formatLogData('warn', message, meta);
    this.logger.warn(message, logData);
    this.sendToCentralizedService('warn', message, logData);
  }

  debug(message: string, meta?: any) {
    const logData = this.formatLogData('debug', message, meta);
    this.logger.debug(message, logData);
    this.sendToCentralizedService('debug', message, logData);
  }

  verbose(message: string, meta?: any) {
    const logData = this.formatLogData('verbose', message, meta);
    this.logger.verbose(message, logData);
    this.sendToCentralizedService('verbose', message, logData);
  }

  private formatLogData(level: string, message: string, meta?: any) {
    return {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      service: this.configService.get('APP_NAME') || 'nestjs-app',
      environment: this.configService.get('NODE_ENV') || 'development',
      version: this.configService.get('APP_VERSION') || '1.0.0',
      hostname: require('os').hostname(),
      pid: process.pid,
      ...meta,
    };
  }

  private async sendToCentralizedService(
    level: string,
    message: string,
    logData: any,
  ) {
    // Send to custom centralized logging endpoint if configured
    const customEndpoint = this.configService.get('CENTRALIZED_LOG_ENDPOINT');
    if (customEndpoint && customEndpoint.trim() !== '') {
      try {
        await axios.post(customEndpoint, logData, {
          headers: {
            'Content-Type': 'application/json',
            Authorization:
              this.configService.get('CENTRALIZED_LOG_AUTH_TOKEN') || '',
          },
          timeout: 5000, // 5 second timeout
        });
      } catch (error: any) {
        // Don't throw error to avoid breaking the application
        console.error(
          'Failed to send log to centralized service:',
          error.message,
        );
      }
    }

    // Send to additional custom endpoints
    const additionalEndpoints = this.configService.get(
      'ADDITIONAL_LOG_ENDPOINTS',
    );
    if (additionalEndpoints && additionalEndpoints.trim() !== '') {
      const endpoints = additionalEndpoints
        .split(',')
        .map((endpoint) => endpoint.trim())
        .filter((endpoint) => endpoint !== '');
      for (const endpoint of endpoints) {
        try {
          await axios.post(endpoint, logData, {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 3000,
          });
        } catch (error: any) {
          console.error(`Failed to send log to ${endpoint}:`, error.message);
        }
      }
    }
  }

  logRequest(req: Request, res: Response, duration: number) {
    const requestLog = {
      requestId: req.headers['x-request-id'] || req.id,
      method: req.method,
      url: req.originalUrl || req.url,
      duration: `${duration}ms`,
      statusCode: res.statusCode,
      userAgent: req.get('user-agent') || '',
      ip: req.ip,
      userId: (req as any).user?.id || 'anonymous',
      systemInfo: {
        platform: req.get('sec-ch-ua-platform') || 'unknown',
        language: req.get('accept-language') || 'unknown',
        host: req.get('host'),
        referer: req.get('referer') || 'direct',
        secure: req.secure,
      },
    };

    if (res.statusCode >= 400) {
      this.error('Request failed', null, requestLog);
    } else {
      this.log('Request completed', requestLog);
    }
  }

  // Method to manually send logs to centralized service
  async sendLogToCentralized(level: string, message: string, meta?: any) {
    // Send the meta data directly without any transformation
    await this.sendToCentralizedService(level, message, meta);
  }

  // Method to get current logging configuration
  getLoggingConfig() {
    return {
      level: this.configService.get('LOG_LEVEL') || 'info',
      elasticsearch: !!this.configService.get('ELASTICSEARCH_URL'),
      customEndpoint: !!this.configService.get('CENTRALIZED_LOG_ENDPOINT'),
      additionalEndpoints:
        this.configService.get('ADDITIONAL_LOG_ENDPOINTS')?.split(',').length ||
        0,
    };
  }
}
