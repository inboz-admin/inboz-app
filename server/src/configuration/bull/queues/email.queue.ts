import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { BaseQueueService } from '../services/base-queue.service';
import { QueueName, JobType, JobPriority } from '../enums/queue.enum';
import { BullConfig } from '../config/bull.config';
import { JobOptions } from '../interfaces/queue.interface';

@Injectable()
export class EmailQueue extends BaseQueueService implements OnModuleInit {
  protected readonly logger = new Logger(EmailQueue.name);
  protected readonly queue: Queue;

  constructor(private readonly configService: ConfigService) {
    super();
    this.queue = BaseQueueService.createQueue(
      QueueName.EMAIL,
      configService,
    );
  }

  async onModuleInit() {
    this.logger.log(`${QueueName.EMAIL} initialized`);
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    to: string,
    name: string,
    options?: JobOptions,
  ): Promise<void> {
    await this.addJob(
      JobType.SEND_WELCOME_EMAIL,
      { to, name },
      {
        priority: JobPriority.HIGH,
        ...options,
      },
    );
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    options?: JobOptions,
  ): Promise<void> {
    await this.addJob(
      JobType.SEND_PASSWORD_RESET,
      { to, resetToken },
      {
        priority: JobPriority.CRITICAL,
        ...options,
      },
    );
  }

  /**
   * Send password reset OTP email
   */
  async sendPasswordResetOtpEmail(
    to: string,
    name: string,
    otp: string,
    options?: JobOptions,
  ): Promise<void> {
    await this.addJob(
      JobType.SEND_PASSWORD_RESET_OTP,
      { to, name, otp },
      {
        priority: JobPriority.CRITICAL,
        ...options,
      },
    );
  }

  /**
   * Send employee credentials email
   */
  async sendEmployeeCredentials(
    to: string,
    name: string,
    email: string,
    password: string,
    options?: JobOptions,
  ): Promise<void> {
    await this.addJob(
      JobType.SEND_EMPLOYEE_CREDENTIALS,
      { to, name, email, password },
      {
        priority: JobPriority.HIGH,
        ...options,
      },
    );
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(
    to: string,
    subject: string,
    content: string,
    options?: JobOptions,
  ): Promise<void> {
    this.logger.log(
      `[EMAIL QUEUE] Queuing notification email - To: ${to}, Subject: ${subject}`,
    );
    
    const job = await this.addJob(
      JobType.SEND_NOTIFICATION_EMAIL,
      { to, subject, content },
      {
        priority: JobPriority.NORMAL,
        ...options,
      },
    );

    this.logger.log(
      `[EMAIL QUEUE] Notification email queued successfully - Job ID: ${job.id}, To: ${to}, Subject: ${subject}`,
    );
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(
    recipients: Array<{ to: string; data: any }>,
    templateType: string,
    options?: JobOptions,
  ): Promise<void> {
    await this.addJob(
      JobType.SEND_BULK_EMAIL,
      { recipients, templateType },
      {
        priority: JobPriority.LOW,
        timeout: 600000, // 10 minutes for bulk
        ...options,
      },
    );
  }
}
