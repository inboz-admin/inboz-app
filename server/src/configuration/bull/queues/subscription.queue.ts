import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { BaseQueueService } from '../services/base-queue.service';
import { QueueName, JobType, JobPriority } from '../enums/queue.enum';
import { BullConfig } from '../config/bull.config';
import { JobOptions } from '../interfaces/queue.interface';
import { AuditLogsService } from 'src/resources/audit-logs/audit-logs.service';
import { AuditAction } from 'src/resources/audit-logs/entities/audit-log.entity';

@Injectable()
export class SubscriptionQueue
  extends BaseQueueService
  implements OnModuleInit
{
  protected readonly logger = new Logger(SubscriptionQueue.name);
  protected readonly queue: Queue;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
  ) {
    super();
    this.queue = BaseQueueService.createQueue(
      QueueName.SUBSCRIPTION,
      configService,
    );
  }

  async onModuleInit() {
    this.logger.log(`${QueueName.SUBSCRIPTION} initialized`);
  }

  async createDefaultSubscription(
    organizationId: string,
    options?: JobOptions,
  ): Promise<void> {
    const job = await this.addJob(
      JobType.CREATE_DEFAULT_SUBSCRIPTION,
      { organizationId },
      {
        priority: JobPriority.HIGH,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        ...options,
      },
    );

    // Log job creation in audit log (job scheduling, not consumption)
    try {
      await this.auditLogsService.createAuditLog({
        organizationId: organizationId,
        performedByUserId: undefined, // System-generated, no user
        module: 'SUBSCRIPTIONS',
        action: AuditAction.SYSTEM,
        recordId: organizationId,
        description: `Subscription creation job scheduled for organization`,
        details: {
          jobId: job.id,
          jobType: JobType.CREATE_DEFAULT_SUBSCRIPTION,
          queueName: QueueName.SUBSCRIPTION,
          organizationId: organizationId,
          triggeredBy: 'auto_signup',
        },
      });
    } catch (error) {
      this.logger.warn('Failed to log subscription job creation:', error);
    }
  }
}

