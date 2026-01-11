import { Controller, Get, Optional } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from 'src/configuration/jwt/public.decorator';
import { ContactBulkUploadQueue } from './configuration/bull/queues/contact-bulk-upload.queue';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Optional() private readonly contactBulkUploadQueue?: ContactBulkUploadQueue,
  ) {}
  @Public()
  @Get()
  getHello(): { message: string } {
    return { message: this.appService.getWelcomeMessage() };
  }

  @Public()
  @Get('health')
  async getHealth(): Promise<{
    status: string;
    timestamp: string;
    redis?: { status: string; message?: string };
  }> {
    const health: {
      status: string;
      timestamp: string;
      redis?: { status: string; message?: string };
    } = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };

    if (this.contactBulkUploadQueue) {
      try {
        const isConnected = await this.contactBulkUploadQueue.checkQueueConnection();
        health.redis = {
          status: isConnected ? 'connected' : 'disconnected',
          message: isConnected
            ? 'Redis connection is healthy'
            : 'Redis connection is unavailable',
        };
      } catch (error) {
        health.redis = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return health;
  }
}
