import { Injectable, Logger } from '@nestjs/common';
import { Campaign } from '../entities/campaign.entity';
import { CampaignStep } from '../entities/campaign-step.entity';
import { CampaignProcessorQueue } from 'src/configuration/bull/queues/campaign-processor.queue';

/**
 * Service for queuing campaign step processing jobs
 * Centralizes step queuing logic (DRY principle)
 */
@Injectable()
export class CampaignStepQueueService {
  private readonly logger = new Logger(CampaignStepQueueService.name);

  constructor(
    private readonly campaignProcessorQueue: CampaignProcessorQueue,
  ) {}

  /**
   * Queue a step for processing
   * Handles both IMMEDIATE and SCHEDULE trigger types
   * 
   * Time Complexity: O(1) - Single queue operation
   * Space Complexity: O(1)
   * 
   * @param step - Campaign step to queue
   * @param campaign - Parent campaign
   * @param delayMs - Optional delay in milliseconds (for scheduled steps)
   */
  async queueStep(
    step: CampaignStep,
    campaign: Campaign,
    delayMs?: number,
  ): Promise<void> {
    const stepName = step.name || `Step ${step.stepOrder}`;
    const now = new Date();

    if (step.triggerType === 'IMMEDIATE') {
      this.logger.log(
        `⚡ Queuing immediate step ${step.id} (order: ${step.stepOrder}) for campaign ${campaign.id}`,
      );
      await this.campaignProcessorQueue.addNewStepJob(
        campaign.id,
        step.id,
        campaign.organizationId,
        'user',
        campaign.name,
        stepName,
        undefined, // No delay for immediate steps
        step.stepOrder,
      );
    } else if (step.triggerType === 'SCHEDULE') {
      if (!step.scheduleTime) {
        this.logger.warn(
          `⚠️ Step ${step.id} (${stepName}) is SCHEDULE type but has no scheduleTime. ` +
            `Processing immediately as fallback.`,
        );
        // Process immediately if scheduleTime is missing
        await this.campaignProcessorQueue.addNewStepJob(
          campaign.id,
          step.id,
          campaign.organizationId,
          'user',
          campaign.name,
          stepName,
          undefined,
          step.stepOrder,
        );
        return;
      }

      const scheduleTime = new Date(step.scheduleTime);
      const timezone = step.timezone || 'UTC';

      // Log timezone info for debugging
      this.logger.log(
        `📅 Scheduled step ${step.id} (${stepName}): ` +
        `scheduleTime UTC: ${scheduleTime.toISOString()}, ` +
        `timezone: ${timezone}, ` +
        `now UTC: ${now.toISOString()}`
      );

      // Calculate delay if not provided
      if (delayMs === undefined) {
        if (scheduleTime > now) {
          delayMs = scheduleTime.getTime() - now.getTime();
          const hoursUntilSchedule = Math.round(delayMs / (1000 * 60 * 60));
          const minutesUntilSchedule = Math.round((delayMs % (1000 * 60 * 60)) / (1000 * 60));
          this.logger.log(
            `⏰ Step scheduled for future: ${hoursUntilSchedule}h ${minutesUntilSchedule}m from now`
          );
        } else {
          delayMs = undefined; // Process immediately if past due
          this.logger.warn(
            `⚠️ Step schedule time is in the past (UTC). Processing immediately. ` +
            `scheduleTime: ${scheduleTime.toISOString()}, now: ${now.toISOString()}`
          );
        }
      }

      if (delayMs && delayMs > 0) {
        const hoursUntilSchedule = Math.round(delayMs / (1000 * 60 * 60));
        this.logger.log(
          `📅 Queuing future scheduled step ${step.id} (${stepName}) - ` +
            `scheduled for ${scheduleTime.toISOString()}, ${hoursUntilSchedule}h ahead. ` +
            `Job will be delayed by ${Math.round(delayMs / 1000 / 60)} minutes.`,
        );
      } else {
        this.logger.log(
          `⏰ Queuing past-due scheduled step ${step.id} (${stepName}) - ` +
            `was scheduled for ${scheduleTime.toISOString()}, processing now.`,
        );
      }

      await this.campaignProcessorQueue.addNewStepJob(
        campaign.id,
        step.id,
        campaign.organizationId,
        'user',
        campaign.name,
        stepName,
        delayMs,
        step.stepOrder,
      );
    } else {
      this.logger.warn(
        `⚠️ Step ${step.id} (${stepName}) has unknown triggerType: ${step.triggerType}. Skipping.`,
      );
    }
  }

  /**
   * Queue multiple steps in batch
   * Used during campaign activation
   * 
   * Time Complexity: O(S) where S = number of steps
   * Space Complexity: O(S) for Promise array
   * 
   * @param steps - Array of steps to queue
   * @param campaign - Parent campaign
   * @param existingEmailsCheck - Optional function to check if step already has emails
   */
  async queueSteps(
    steps: CampaignStep[],
    campaign: Campaign,
    existingEmailsCheck?: (stepId: string) => Promise<number>,
  ): Promise<{
    immediateStepsProcessed: number;
    pastScheduledStepsProcessed: number;
    futureScheduledStepsDeferred: number;
  }> {
    let immediateStepsProcessed = 0;
    let pastScheduledStepsProcessed = 0;
    let futureScheduledStepsDeferred = 0;

    const now = new Date();

    for (const step of steps) {
      // Skip steps that already have emails (for immediate steps)
      if (existingEmailsCheck && step.triggerType === 'IMMEDIATE') {
        const existingCount = await existingEmailsCheck(step.id);
        if (existingCount > 0) {
          this.logger.log(
            `Step ${step.id} already has ${existingCount} emails, skipping`,
          );
          continue;
        }
      }

      const stepName = step.name || `Step ${step.stepOrder}`;

      if (step.triggerType === 'IMMEDIATE') {
        await this.queueStep(step, campaign);
        immediateStepsProcessed++;
      } else if (step.triggerType === 'SCHEDULE') {
        if (!step.scheduleTime) {
          await this.queueStep(step, campaign);
          pastScheduledStepsProcessed++;
          continue;
        }

        const scheduleTime = new Date(step.scheduleTime);
        if (scheduleTime > now) {
          await this.queueStep(step, campaign);
          futureScheduledStepsDeferred++;
        } else {
          await this.queueStep(step, campaign);
          pastScheduledStepsProcessed++;
        }
      }
    }

    this.logger.log(
      `Queued steps summary: Immediate: ${immediateStepsProcessed}, ` +
        `Past-due scheduled: ${pastScheduledStepsProcessed}, ` +
        `Future scheduled: ${futureScheduledStepsDeferred}`,
    );

    return {
      immediateStepsProcessed,
      pastScheduledStepsProcessed,
      futureScheduledStepsDeferred,
    };
  }
}



