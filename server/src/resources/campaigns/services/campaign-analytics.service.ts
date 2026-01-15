import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Campaign } from '../entities/campaign.entity';
import { CampaignsRepository } from '../campaigns.repository';
import { EmailMessage, EmailMessageStatus } from '../entities/email-message.entity';
import { EmailTrackingEvent, EmailEventType } from '../entities/email-tracking-event.entity';
import { InjectModel } from '@nestjs/sequelize';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import { Op, literal } from 'sequelize';
import { CampaignProgressService } from './campaign-progress.service';
import { ICampaignAnalyticsService } from '../interfaces/campaign-analytics.interface';

@Injectable()
export class CampaignAnalyticsService implements ICampaignAnalyticsService {
  private readonly logger = new Logger(CampaignAnalyticsService.name);

  constructor(
    private readonly campaignsRepository: CampaignsRepository,
    @InjectModel(EmailMessage)
    private readonly emailMessageModel: typeof EmailMessage,
    @InjectModel(EmailTrackingEvent)
    private readonly emailTrackingEventModel: typeof EmailTrackingEvent,
    @InjectModel(Contact)
    private readonly contactModel: typeof Contact,
    private readonly progressService: CampaignProgressService,
  ) {}

  async getCampaignProgress(campaignId: string): Promise<any> {
    const campaign = (await this.campaignsRepository.findById(campaignId)) as Campaign | null;
    
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    const progress = await this.progressService.calculateCampaignProgress(campaignId);

    return {
      campaignId,
      status: campaign.status,
      totalExpectedEmails: progress.totalExpectedEmails,
      totalEmails: progress.totalExpectedEmails,
      sentEmails: progress.emailsSent,
      deliveredEmails: progress.emailsDelivered,
      failedEmails: progress.emailsFailed,
      bouncedEmails: progress.emailsBounced,
      openedEmails: progress.emailsOpened,
      clickedEmails: progress.emailsClicked,
      queuedEmails: progress.emailsQueued,
      scheduledEmails: progress.emailsScheduled,
      cancelledEmails: progress.emailsCancelled,
      percentage: progress.progressPercentage,
      totalSteps: campaign.totalSteps || 0,
      totalRecipients: campaign.totalRecipients || 0,
    };
  }

  async getStepEmails(
    campaignId: string,
    stepId: string,
    eventType?: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
  ) {
    const whereConditions: any = {
      campaignId,
      campaignStepId: stepId,
    };

    // Add status filter if provided and not 'ALL'
    if (status && status !== 'ALL') {
      whereConditions.status = status;
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    let emailMessages: any[] = [];
    let totalCount = 0;

    if (eventType === 'OPENED') {
      // Get total count - simple approach like BOUNCED/UNSUBSCRIBED
      whereConditions.openedAt = { [Op.ne]: null };
      totalCount = await this.emailMessageModel.count({
        where: whereConditions,
      });

      const emails = await this.emailMessageModel.findAll({
        where: whereConditions,
        include: [
          {
            model: this.contactModel,
            as: 'contact',
            attributes: ['id', 'email', 'firstName', 'lastName'],
          },
          {
            model: this.emailTrackingEventModel,
            as: 'trackingEvents',
            where: {
              eventType: EmailEventType.OPENED,
            },
            required: true,
            attributes: ['id', 'occurredAt', 'eventData'],
            order: [['occurredAt', 'DESC']],
            separate: true,
          },
        ],
        limit,
        offset,
        order: [['sentAt', 'DESC'], ['createdAt', 'DESC']],
      });
      emailMessages = emails.map((email: any) => {
        const emailData = email.toJSON();
        const firstEvent = emailData.trackingEvents?.[0];
        return {
          ...emailData,
          eventOccurredAt: firstEvent?.occurredAt || emailData.openedAt,
          eventData: firstEvent?.eventData,
        };
      });
    } else if (eventType === 'CLICKED') {
      // Get total count - simple approach like BOUNCED/UNSUBSCRIBED
      whereConditions.clickedAt = { [Op.ne]: null };
      totalCount = await this.emailMessageModel.count({
        where: whereConditions,
      });

      const emails = await this.emailMessageModel.findAll({
        where: whereConditions,
        include: [
          {
            model: this.contactModel,
            as: 'contact',
            attributes: ['id', 'email', 'firstName', 'lastName'],
          },
          {
            model: this.emailTrackingEventModel,
            as: 'trackingEvents',
            where: {
              eventType: EmailEventType.CLICKED,
            },
            required: true,
            attributes: ['id', 'occurredAt', 'clickedUrl', 'eventData'],
            order: [['occurredAt', 'DESC']],
            separate: true,
          },
        ],
        limit,
        offset,
        order: [['sentAt', 'DESC'], ['createdAt', 'DESC']],
      });
      emailMessages = emails.map((email: any) => {
        const emailData = email.toJSON();
        const firstEvent = emailData.trackingEvents?.[0];
        return {
          ...emailData,
          eventOccurredAt: firstEvent?.occurredAt || emailData.clickedAt,
          clickedUrl: firstEvent?.clickedUrl,
          eventData: firstEvent?.eventData,
        };
      });
    } else if (eventType === 'REPLIED') {
      // Get total count - simple approach like BOUNCED/UNSUBSCRIBED
      whereConditions.repliedAt = { [Op.ne]: null };
      whereConditions.replyCount = { [Op.gt]: 0 };
      totalCount = await this.emailMessageModel.count({
        where: whereConditions,
      });

      const emails = await this.emailMessageModel.findAll({
        where: {
          ...whereConditions,
          replyCount: { [Op.gt]: 0 },
        },
        include: [
          {
            model: this.contactModel,
            as: 'contact',
            attributes: ['id', 'email', 'firstName', 'lastName'],
          },
          {
            model: this.emailTrackingEventModel,
            as: 'trackingEvents',
            where: {
              eventType: EmailEventType.REPLIED,
            },
            required: true,
            attributes: ['id', 'occurredAt', 'eventData', 'gmailMessageId'],
            order: [['occurredAt', 'DESC']],
            separate: true,
          },
        ],
        limit,
        offset,
        order: [['repliedAt', 'DESC'], ['createdAt', 'DESC']],
      });
      emailMessages = emails.map((email: any) => {
        const emailData = email.toJSON();
        const firstEvent = emailData.trackingEvents?.[0];
        return {
          ...emailData,
          eventOccurredAt: firstEvent?.occurredAt || emailData.repliedAt,
          snippet: firstEvent?.eventData?.snippet,
          eventData: firstEvent?.eventData,
        };
      });
    } else if (eventType === 'BOUNCED') {
      // For BOUNCED eventType, always filter by BOUNCED status
      // Status filter from dropdown is ignored for eventType-specific queries
      whereConditions.status = EmailMessageStatus.BOUNCED;
      // Get total count
      totalCount = await this.emailMessageModel.count({
        where: whereConditions,
      });

      const emails = await this.emailMessageModel.findAll({
        where: whereConditions,
        include: [
          {
            model: this.contactModel,
            as: 'contact',
            attributes: ['id', 'email', 'firstName', 'lastName'],
          },
        ],
        limit,
        offset,
        order: [['bouncedAt', 'DESC']],
      });
      emailMessages = emails.map((email: any) => email.toJSON());
    } else if (eventType === 'UNSUBSCRIBED') {
      whereConditions.unsubscribedAt = { [Op.ne]: null };
      // Get total count
      totalCount = await this.emailMessageModel.count({
        where: whereConditions,
      });

      const emails = await this.emailMessageModel.findAll({
        where: whereConditions,
        include: [
          {
            model: this.contactModel,
            as: 'contact',
            attributes: ['id', 'email', 'firstName', 'lastName'],
          },
        ],
        limit,
        offset,
        order: [['unsubscribedAt', 'DESC']],
      });
      emailMessages = emails.map((email: any) => email.toJSON());
    } else {
      // Get total count
      totalCount = await this.emailMessageModel.count({
        where: whereConditions,
      });

      const emails = await this.emailMessageModel.findAll({
        where: whereConditions,
        include: [
          {
            model: this.contactModel,
            as: 'contact',
            attributes: ['id', 'email', 'firstName', 'lastName'],
          },
          {
            model: this.emailTrackingEventModel,
            as: 'trackingEvents',
            required: false,
            attributes: ['id', 'eventType', 'occurredAt', 'clickedUrl', 'eventData'],
            order: [['occurredAt', 'DESC']],
            separate: true,
          },
        ],
        limit,
        offset,
        order: [
          [literal('ISNULL(scheduled_send_at)'), 'ASC'], // Sort NULLs last (0 = non-NULL, 1 = NULL)
          [literal('scheduled_send_at'), 'ASC'],
          ['sentAt', 'DESC'],
          ['createdAt', 'DESC'],
        ],
      });
      emailMessages = emails.map((email: any) => {
        const emailData = email.toJSON();
        const clickEvents = emailData.trackingEvents?.filter((e: any) => e.eventType === EmailEventType.CLICKED) || [];
        const firstClickEvent = clickEvents[0];
        return {
          ...emailData,
          clickedUrl: firstClickEvent?.clickedUrl || null,
        };
      });
    }

    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true,
      data: emailMessages,
      total: totalCount,
      page,
      limit,
      totalPages,
      count: emailMessages.length,
    };
  }
}

