import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  EmailQueue,
  FileProcessingQueue,
  NotificationQueue,
  CleanupQueue,
  ContactBulkUploadQueue,
  CampaignProcessorQueue,
  EmailSenderQueue,
  DeadLetterQueue,
  BounceDetectionQueue,
  ReplyDetectionQueue,
} from './index';
import { QueueHealthService } from './services/queue-health.service';
import { QueueRegistryService } from './services/queue-registry.service';

@Controller('queues')
export class BullController {
  private queues: Map<string, any>;

  constructor(
    private readonly emailQueue: EmailQueue,
    private readonly fileQueue: FileProcessingQueue,
    private readonly notificationQueue: NotificationQueue,
    private readonly cleanupQueue: CleanupQueue,
    private readonly contactBulkUploadQueue: ContactBulkUploadQueue,
    private readonly campaignProcessorQueue: CampaignProcessorQueue,
    private readonly emailSenderQueue: EmailSenderQueue,
    private readonly deadLetterQueue: DeadLetterQueue,
    private readonly bounceDetectionQueue: BounceDetectionQueue,
    private readonly replyDetectionQueue: ReplyDetectionQueue,
    private readonly queueHealthService: QueueHealthService,
  ) {
    // Map queue names to queue instances
    this.queues = new Map<string, any>([
      ['email', this.emailQueue],
      ['file-processing', this.fileQueue],
      ['notification', this.notificationQueue],
      ['cleanup', this.cleanupQueue],
      ['contact-bulk-upload', this.contactBulkUploadQueue],
      ['campaign-processor', this.campaignProcessorQueue],
      ['email-sender', this.emailSenderQueue],
      ['dead-letter', this.deadLetterQueue],
      ['bounce-detection', this.bounceDetectionQueue],
      ['reply-detection', this.replyDetectionQueue],
    ]);
  }

  /**
   * Get all queue metrics
   * GET /api/v1/queues/metrics
   */
  @Get('metrics')
  async getAllMetrics() {
    const emailMetrics = await this.emailQueue.getMetrics();
    const fileMetrics = await this.fileQueue.getMetrics();
    const notificationMetrics = await this.notificationQueue.getMetrics();
    const cleanupMetrics = await this.cleanupQueue.getMetrics();
    const contactBulkMetrics = await this.contactBulkUploadQueue.getMetrics();
    const campaignProcessorMetrics = await this.campaignProcessorQueue.getMetrics();
    const emailSenderMetrics = await this.emailSenderQueue.getMetrics();
    const deadLetterMetrics = await this.deadLetterQueue.getMetrics();
    const bounceDetectionMetrics = await this.bounceDetectionQueue.getMetrics();
    const replyDetectionMetrics = await this.replyDetectionQueue.getMetrics();

    return {
      email: emailMetrics,
      fileProcessing: fileMetrics,
      notification: notificationMetrics,
      cleanup: cleanupMetrics,
      contactBulkUpload: contactBulkMetrics,
      campaignProcessor: campaignProcessorMetrics,
      emailSender: emailSenderMetrics,
      deadLetter: deadLetterMetrics,
      bounceDetection: bounceDetectionMetrics,
      replyDetection: replyDetectionMetrics,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get metrics for specific queue
   * GET /api/v1/queues/:queueName/metrics
   */
  @Get(':queueName/metrics')
  async getQueueMetrics(@Param('queueName') queueName: string) {
    const queue = this.getQueue(queueName);
    const metrics = await queue.getMetrics();

    return {
      queue: queueName,
      ...metrics,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get jobs from a queue
   * GET /api/v1/queues/:queueName/jobs?state=waiting&limit=50
   */
  @Get(':queueName/jobs')
  async getJobs(
    @Param('queueName') queueName: string,
    @Query('state')
    state?:
      | 'completed'
      | 'failed'
      | 'delayed'
      | 'active'
      | 'waiting'
      | 'paused',
    @Query('limit') limit?: number,
  ) {
    const queue = this.getQueue(queueName);
    const jobLimit = Math.min(limit || 50, 100); // Max 100
    const jobs = await queue.getJobs(state || 'waiting', 0, jobLimit);

    return {
      queue: queueName,
      state: state || 'waiting',
      total: jobs.length,
      jobs: jobs.map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress,
        timestamp: job.timestamp,
        attemptsMade: job.attemptsMade,
      })),
    };
  }

  /**
   * Get specific job by ID
   * GET /api/v1/queues/:queueName/jobs/:jobId
   */
  @Get(':queueName/jobs/:jobId')
  async getJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    return {
      queue: queueName,
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      state: await job.getState(),
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      returnvalue: job.returnvalue,
    };
  }

  /**
   * Retry a failed job
   * POST /api/v1/queues/:queueName/jobs/:jobId/retry
   */
  @Post(':queueName/jobs/:jobId/retry')
  async retryJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    const queue = this.getQueue(queueName);
    await queue.retryJob(jobId);

    return {
      success: true,
      message: `Job ${jobId} queued for retry`,
      queue: queueName,
      jobId,
    };
  }

  /**
   * Remove a job
   * DELETE /api/v1/queues/:queueName/jobs/:jobId
   */
  @Post(':queueName/jobs/:jobId/remove')
  async removeJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    const queue = this.getQueue(queueName);
    await queue.removeJob(jobId);

    return {
      success: true,
      message: `Job ${jobId} removed`,
      queue: queueName,
      jobId,
    };
  }

  /**
   * Clean old jobs from queue
   * POST /api/v1/queues/:queueName/clean
   */
  @Post(':queueName/clean')
  async cleanJobs(
    @Param('queueName') queueName: string,
    @Body()
    body: {
      grace?: number;
      limit?: number;
      type?: 'completed' | 'failed';
    },
  ) {
    const queue = this.getQueue(queueName);
    const grace = body.grace || 24 * 60 * 60 * 1000; // 24 hours default
    const limit = body.limit || 1000;
    const type = body.type || 'completed';

    const cleaned = await queue.cleanJobs(grace, limit, type);

    return {
      success: true,
      message: `Cleaned ${cleaned.length} ${type} jobs`,
      queue: queueName,
      count: cleaned.length,
      type,
    };
  }

  /**
   * Pause a queue
   * POST /api/v1/queues/:queueName/pause
   */
  @Post(':queueName/pause')
  async pauseQueue(@Param('queueName') queueName: string) {
    const queue = this.getQueue(queueName);
    await queue.pause();

    return {
      success: true,
      message: `Queue ${queueName} paused`,
      queue: queueName,
    };
  }

  /**
   * Resume a queue
   * POST /api/v1/queues/:queueName/resume
   */
  @Post(':queueName/resume')
  async resumeQueue(@Param('queueName') queueName: string) {
    const queue = this.getQueue(queueName);
    await queue.resume();

    return {
      success: true,
      message: `Queue ${queueName} resumed`,
      queue: queueName,
    };
  }

  /**
   * Empty a queue (remove all jobs)
   * POST /api/v1/queues/:queueName/empty
   */
  @Post(':queueName/empty')
  async emptyQueue(@Param('queueName') queueName: string) {
    const queue = this.getQueue(queueName);
    await queue.empty();

    return {
      success: true,
      message: `Queue ${queueName} emptied`,
      queue: queueName,
      warning: 'All jobs removed from queue',
    };
  }

  /**
   * Get queue instance by name
   */
  private getQueue(queueName: string): any {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new BadRequestException(
        `Invalid queue name. Available queues: ${Array.from(this.queues.keys()).join(', ')}`,
      );
    }

    return queue;
  }

  /**
   * Health check endpoint for queues and workers
   */
  @Get('health')
  async getHealth() {
    const health = await this.queueHealthService.getWorkerHealth();
    return {
      status: health.status,
      redis: health.redis,
      queues: health.queues,
      timestamp: health.timestamp,
    };
  }

  /**
   * Quick health status
   */
  @Get('health/status')
  async getHealthStatus() {
    return await this.queueHealthService.getWorkerStatus();
  }
}
