import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { BaseQueueService } from '../services/base-queue.service';
import { QueueName, JobType, JobPriority } from '../enums/queue.enum';
import { BullConfig } from '../config/bull.config';
import { JobOptions } from '../interfaces/queue.interface';

@Injectable()
export class NotificationQueue
  extends BaseQueueService
  implements OnModuleInit
{
  protected readonly logger = new Logger(NotificationQueue.name);
  protected readonly queue: Queue;

  constructor(private readonly configService: ConfigService) {
    super();
    this.queue = BaseQueueService.createQueue(
      QueueName.NOTIFICATION,
      configService,
    );
  }

  async onModuleInit() {
    this.logger.log(`${QueueName.NOTIFICATION} initialized`);
  }

  /**
   * Send push notification
   */
  async sendPushNotification(
    userId: string,
    title: string,
    message: string,
    data?: any,
    options?: JobOptions,
  ): Promise<void> {
    await this.addJob(
      JobType.SEND_PUSH_NOTIFICATION,
      { userId, title, message, data },
      {
        priority: JobPriority.HIGH,
        ...options,
      },
    );
  }

  /**
   * Send SMS
   */
  async sendSms(
    phoneNumber: string,
    message: string,
    options?: JobOptions,
  ): Promise<void> {
    await this.addJob(
      JobType.SEND_SMS,
      { phoneNumber, message },
      {
        priority: JobPriority.HIGH,
        ...options,
      },
    );
  }

  /**
   * Send webhook
   */
  async sendWebhook(
    url: string,
    payload: any,
    method: 'POST' | 'PUT' = 'POST',
    options?: JobOptions,
  ): Promise<void> {
    await this.addJob(
      JobType.SEND_WEBHOOK,
      { url, payload, method },
      {
        priority: JobPriority.NORMAL,
        attempts: 5,
        ...options,
      },
    );
  }
}
