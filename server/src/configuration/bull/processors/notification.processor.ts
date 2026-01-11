import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseProcessor } from './base.processor';
import { QueueName, JobType } from '../enums/queue.enum';
import { JobResult } from '../interfaces/queue.interface';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Processor(QueueName.NOTIFICATION)
export class NotificationProcessor extends WorkerHost {
  protected readonly logger = new Logger(NotificationProcessor.name);
  private readonly baseProcessor: NotificationProcessorImpl;

  constructor(private readonly httpService: HttpService) {
    super();
    this.baseProcessor = new NotificationProcessorImpl(httpService);
  }

  async process(job: Job): Promise<any> {
    return await this.baseProcessor.executeWithLogging(job);
  }
}

class NotificationProcessorImpl extends BaseProcessor {
  protected readonly logger = new Logger('NotificationProcessorImpl');

  constructor(private readonly httpService: HttpService) {
    super();
  }

  async process(job: Job): Promise<JobResult> {
    switch (job.name) {
      case JobType.SEND_PUSH_NOTIFICATION:
        return await this.sendPushNotification(job);
      case JobType.SEND_SMS:
        return await this.sendSms(job);
      case JobType.SEND_WEBHOOK:
        return await this.sendWebhook(job);
      default:
        return this.createErrorResult(`Unknown job type: ${job.name}`);
    }
  }

  private async sendPushNotification(job: Job): Promise<JobResult> {
    try {
      this.validateJobData(job, ['userId', 'title', 'message']);
      const { userId, title, message, data } = job.data;

      // Implement push notification logic here
      // This could integrate with Firebase, OneSignal, etc.
      this.logger.log(`Sending push notification to user ${userId}: ${title}`);

      // Simulate sending
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return this.createSuccessResult({
        userId,
        title,
        sentAt: new Date(),
      });
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }

  private async sendSms(job: Job): Promise<JobResult> {
    try {
      this.validateJobData(job, ['phoneNumber', 'message']);
      const { phoneNumber, message } = job.data;

      // Implement SMS sending logic here
      // This could integrate with Twilio, AWS SNS, etc.
      this.logger.log(`Sending SMS to ${phoneNumber}`);

      // Simulate sending
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return this.createSuccessResult({
        phoneNumber,
        sentAt: new Date(),
      });
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }

  private async sendWebhook(job: Job): Promise<JobResult> {
    try {
      this.validateJobData(job, ['url', 'payload']);
      const { url, payload, method = 'POST' } = job.data;

      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url,
          data: payload,
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds
        }),
      );

      return this.createSuccessResult({
        url,
        statusCode: response.status,
        sentAt: new Date(),
      });
    } catch (error: any) {
      return this.createErrorResult(`Webhook failed: ${error.message}`);
    }
  }
}
