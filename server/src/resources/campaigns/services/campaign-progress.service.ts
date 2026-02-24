import { Injectable, Logger } from '@nestjs/common';
import { EmailMessagesRepository } from '../repositories/email-messages.repository';
import { EmailTrackingEventsRepository } from '../repositories/email-tracking-events.repository';
import { EmailMessageStatus } from '../entities/email-message.entity';
import { EmailEventType } from '../entities/email-tracking-event.entity';
import { CampaignStep } from '../entities/campaign-step.entity';
import { InjectModel } from '@nestjs/sequelize';
import { EmailMessage } from '../entities/email-message.entity';

export interface StepProgressMetrics {
  emailsSent: number;
  emailsDelivered: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsBounced: number;
  emailsFailed: number;
  emailsCancelled: number;
  emailsQueued: number;
  emailsScheduled: number;
  emailsCompleted: number;
  progressPercentage: number;
  totalExpected: number;
}

export interface CampaignProgressMetrics {
  emailsSent: number;
  emailsDelivered: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsBounced: number;
  emailsFailed: number;
  emailsQueued: number;
  emailsScheduled: number;
  emailsCancelled: number;
  emailsCompleted: number;
  progressPercentage: number;
  totalExpectedEmails: number;
}

@Injectable()
export class CampaignProgressService {
  private readonly logger = new Logger(CampaignProgressService.name);

  constructor(
    private readonly emailMessagesRepository: EmailMessagesRepository,
    private readonly emailTrackingEventsRepository: EmailTrackingEventsRepository,
    @InjectModel(EmailMessage)
    private readonly emailMessageModel: typeof EmailMessage,
  ) {}

  async calculateStepProgress(
    campaignId: string,
    stepId: string,
    step: CampaignStep,
  ): Promise<StepProgressMetrics> {
    const [
      emailsSent,
      emailsDelivered,
      emailsBounced,
      emailsFailed,
      emailsCancelled,
      emailsQueued,
      stepTotal,
      emailsOpened,
      emailsClicked,
    ] = await Promise.all([
      this.emailMessagesRepository.countByStatus(campaignId, stepId, [
        EmailMessageStatus.SENT,
        EmailMessageStatus.DELIVERED,
        EmailMessageStatus.SENDING,
      ]),
      this.emailMessagesRepository.countByStatus(campaignId, stepId, [
        EmailMessageStatus.DELIVERED,
      ]),
      this.emailMessagesRepository.countByStatus(campaignId, stepId, [
        EmailMessageStatus.BOUNCED,
      ]),
      this.emailMessagesRepository.countByStatus(campaignId, stepId, [
        EmailMessageStatus.FAILED,
      ]),
      this.emailMessagesRepository.countByStatus(campaignId, stepId, [
        EmailMessageStatus.CANCELLED,
      ]),
      this.emailMessagesRepository.countByStatus(campaignId, stepId, [
        EmailMessageStatus.QUEUED,
      ]),
      this.emailMessagesRepository.countAll(campaignId, stepId),
      this.emailTrackingEventsRepository.countByEventType(
        campaignId,
        stepId,
        EmailEventType.OPENED,
      ),
      this.emailTrackingEventsRepository.countByEventType(
        campaignId,
        stepId,
        EmailEventType.CLICKED,
      ),
    ]);

    let actualTotalExpected = stepTotal;
    if (stepTotal === 0 && step.replyToStepId) {
      const previousStepEmails = await this.emailMessagesRepository.countAll(
        campaignId,
        step.replyToStepId,
      );

      if (previousStepEmails > 0) {
        actualTotalExpected = 0;
      }
    }

    // Include CANCELLED so progress reaches 100% when all emails are in a terminal state
    const emailsCompleted = emailsSent + emailsBounced + emailsFailed + emailsCancelled;
    const progressPercentage =
      actualTotalExpected > 0
        ? Math.min(100, (emailsCompleted / actualTotalExpected) * 100)
        : actualTotalExpected === 0 && step.replyToStepId
          ? 100
          : 0;

    return {
      emailsSent,
      emailsDelivered,
      emailsOpened,
      emailsClicked,
      emailsBounced,
      emailsFailed,
      emailsCancelled,
      emailsQueued,
      emailsScheduled: emailsQueued, // Same as queued
      emailsCompleted,
      progressPercentage,
      totalExpected: actualTotalExpected,
    };
  }

  async calculateCampaignProgress(
    campaignId: string,
  ): Promise<CampaignProgressMetrics> {
    const [
      totalExpectedEmails,
      emailsSent,
      emailsDelivered,
      emailsBounced,
      emailsFailed,
      emailsQueued,
      emailsCancelled,
      emailsOpened,
      emailsClicked,
    ] = await Promise.all([
      this.emailMessagesRepository.countAll(campaignId),
      this.emailMessagesRepository.countByStatus(campaignId, null, [
        EmailMessageStatus.SENT,
        EmailMessageStatus.DELIVERED,
        EmailMessageStatus.SENDING,
      ]),
      this.emailMessagesRepository.countByStatus(campaignId, null, [
        EmailMessageStatus.DELIVERED,
      ]),
      this.emailMessagesRepository.countByStatus(campaignId, null, [
        EmailMessageStatus.BOUNCED,
      ]),
      this.emailMessagesRepository.countByStatus(campaignId, null, [
        EmailMessageStatus.FAILED,
      ]),
      this.emailMessagesRepository.countByStatus(campaignId, null, [
        EmailMessageStatus.QUEUED,
      ]),
      this.emailMessagesRepository.countByStatus(campaignId, null, [
        EmailMessageStatus.CANCELLED,
      ]),
      this.emailTrackingEventsRepository.countByEventType(
        campaignId,
        null,
        EmailEventType.OPENED,
      ),
      this.emailTrackingEventsRepository.countByEventType(
        campaignId,
        null,
        EmailEventType.CLICKED,
      ),
    ]);

    // Include CANCELLED so progress reaches 100% when campaign is completed (all emails in terminal state)
    const emailsCompleted = emailsSent + emailsBounced + emailsFailed + emailsCancelled;
    const progressPercentage =
      totalExpectedEmails > 0
        ? Math.min(100, (emailsCompleted / totalExpectedEmails) * 100)
        : 0;

    return {
      emailsSent,
      emailsDelivered,
      emailsOpened,
      emailsClicked,
      emailsBounced,
      emailsFailed,
      emailsQueued,
      emailsScheduled: emailsQueued,
      emailsCancelled,
      emailsCompleted,
      progressPercentage,
      totalExpectedEmails,
    };
  }
}

