import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseProcessor } from './base.processor';
import { QueueName, JobType } from '../enums/queue.enum';
import { JobResult } from '../interfaces/queue.interface';
import { EmailService } from '../../email/email.service';

@Processor(QueueName.EMAIL)
export class EmailProcessor extends WorkerHost {
  protected readonly logger = new Logger(EmailProcessor.name);
  private readonly baseProcessor: EmailProcessorImpl;

  constructor(private readonly emailService: EmailService) {
    super();
    this.baseProcessor = new EmailProcessorImpl(emailService);
  }

  async process(job: Job): Promise<any> {
    return await this.baseProcessor.executeWithLogging(job);
  }
}

class EmailProcessorImpl extends BaseProcessor {
  protected readonly logger = new Logger('EmailProcessorImpl');

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job): Promise<JobResult> {
    switch (job.name) {
      case JobType.SEND_WELCOME_EMAIL:
        return await this.processWelcomeEmail(job);
      case JobType.SEND_PASSWORD_RESET:
        return await this.processPasswordResetEmail(job);
      case JobType.SEND_PASSWORD_RESET_OTP:
        return await this.processPasswordResetOtp(job);
      case JobType.SEND_EMPLOYEE_CREDENTIALS:
        return await this.processEmployeeCredentials(job);
      case JobType.SEND_STUDENT_CREDENTIALS:
        return await this.processStudentCredentials(job);
      case JobType.SEND_NOTIFICATION_EMAIL:
        return await this.processNotificationEmail(job);
      case JobType.SEND_BULK_EMAIL:
        return await this.processBulkEmail(job);
      default:
        return this.createErrorResult(`Unknown job type: ${job.name}`);
    }
  }

  private async processWelcomeEmail(job: Job): Promise<JobResult> {
    try {
      this.validateJobData(job, ['to', 'name']);
      const { to, name } = job.data;

      await this.emailService.sendWelcomeEmail(to, name);

      return this.createSuccessResult({
        sentTo: to,
        emailType: 'welcome',
      });
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }

  private async processPasswordResetEmail(job: Job): Promise<JobResult> {
    try {
      this.validateJobData(job, ['to', 'resetToken']);
      const { to, resetToken } = job.data;

      await this.emailService.sendPasswordReset(to, resetToken);

      return this.createSuccessResult({
        sentTo: to,
        emailType: 'password_reset',
      });
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }

  private async processPasswordResetOtp(job: Job): Promise<JobResult> {
    try {
      this.validateJobData(job, ['to', 'name', 'otp']);
      const { to, name, otp } = job.data;

      await this.emailService.sendPasswordResetOtp(to, name, otp);

      return this.createSuccessResult({
        sentTo: to,
        emailType: 'password_reset_otp',
      });
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }

  private async processEmployeeCredentials(job: Job): Promise<JobResult> {
    try {
      this.validateJobData(job, ['to', 'name', 'email', 'password']);
      const { to, name, email, password } = job.data;

      await this.emailService.sendPlatformEmployeeCredentials(
        to,
        name,
        email,
        password,
      );

      return this.createSuccessResult({
        sentTo: to,
        emailType: 'employee_credentials',
      });
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }

  private async processStudentCredentials(job: Job): Promise<JobResult> {
    try {
      this.validateJobData(job, ['to', 'name', 'email', 'password']);
      const { to, name, email, password } = job.data;

      await this.emailService.sendStudentCredentials(to, name, email, password);

      return this.createSuccessResult({
        sentTo: to,
        emailType: 'student_credentials',
      });
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }

  private async processNotificationEmail(job: Job): Promise<JobResult> {
    try {
      this.validateJobData(job, ['to', 'subject', 'content']);
      const { to, subject, content } = job.data;

      this.logger.log(
        `[EMAIL PROCESSOR] Processing notification email - Job ID: ${job.id}, To: ${to}, Subject: ${subject}`,
      );

      await this.emailService.sendNotification(to, subject, content);

      this.logger.log(
        `[EMAIL PROCESSOR] ✅ Notification email sent successfully - Job ID: ${job.id}, To: ${to}, Subject: ${subject}`,
      );

      return this.createSuccessResult({
        sentTo: to,
        emailType: 'notification',
      });
    } catch (error: any) {
      this.logger.error(
        `[EMAIL PROCESSOR] ❌ Failed to send notification email - Job ID: ${job.id}, To: ${job.data?.to}, Error: ${error.message}`,
        error.stack,
      );
      return this.createErrorResult(error);
    }
  }

  private async processBulkEmail(job: Job): Promise<JobResult> {
    try {
      this.validateJobData(job, ['recipients', 'templateType']);
      const { recipients, templateType } = job.data;

      const results = {
        total: recipients.length,
        sent: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];

        // Update progress
        await this.updateProgress(
          job,
          Math.round(((i + 1) / recipients.length) * 100),
          `Sending email ${i + 1}/${recipients.length}`,
        );

        try {
          // Send email based on template type
          await this.emailService.sendNotification(
            recipient.to,
            recipient.data.subject || 'Notification',
            recipient.data.content || '',
          );
          results.sent++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(
            `Failed to send to ${recipient.to}: ${error.message}`,
          );
        }
      }

      return this.createSuccessResult(results);
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }
}
