import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueName } from '../enums/queue.enum';

/**
 * Dead Letter Queue Processor
 * Processes failed jobs and logs them for manual inspection/retry
 */
@Processor(QueueName.DEAD_LETTER)
export class DeadLetterProcessor extends WorkerHost {
  private readonly logger = new Logger(DeadLetterProcessor.name);

  async process(job: Job): Promise<any> {
    const { originalQueue, originalJobId, error, failedAt } = job.data;

    this.logger.error(
      `Dead Letter Job: ${originalJobId} from ${originalQueue}`,
      {
        originalQueue,
        originalJobId,
        error,
        failedAt,
        dlqJobId: job.id,
      },
    );

    // Log to database or external monitoring service
    // For now, just log - can be extended to send alerts, store in DB, etc.

    return {
      success: true,
      message: 'Failed job logged in DLQ',
      originalQueue,
      originalJobId,
      error,
    };
  }
}

