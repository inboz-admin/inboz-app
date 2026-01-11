import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { WsGateway } from 'src/resources/ws/ws.gateway';
import { Campaign } from 'src/resources/campaigns/entities/campaign.entity';
import { PushNotificationService } from './push-notification.service';

@Injectable()
export class NotificationEventService {
  private readonly logger = new Logger(NotificationEventService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly wsGateway: WsGateway,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  /**
   * Create a campaign-related notification
   */
  private async createCampaignNotification(
    campaign: Campaign,
    type: NotificationType,
    title: string,
    message: string,
    userId?: string,
  ): Promise<void> {
    try {
      const targetUserId = userId || campaign.createdBy;

      if (!targetUserId) {
        this.logger.warn(
          `Cannot create notification for campaign ${campaign.id}: no user ID available`,
        );
        return;
      }

      const notification = await this.notificationsService.createNotification({
        organizationId: campaign.organizationId,
        userId: targetUserId,
        type,
        title,
        message,
        data: {
          campaignId: campaign.id,
          campaignName: campaign.name,
          campaignStatus: campaign.status,
        },
      });

      // Emit via WebSocket
      await this.wsGateway.emitNotification(targetUserId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: notification.createdAt,
        readAt: notification.readAt,
      });

      // Send browser push notification
      await this.pushNotificationService.sendPushNotification(
        targetUserId,
        notification.title,
        notification.message,
        {
          id: notification.id,
          type: notification.type,
          link: `/dashboard/campaigns/${campaign.id}`,
          ...notification.data,
        },
      );

      this.logger.log(
        `Notification created and sent: ${notification.id} for campaign ${campaign.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create notification for campaign ${campaign.id}:`,
        error,
      );
    }
  }

  /**
   * Notify when a campaign is completed
   */
  async notifyCampaignCompleted(campaign: Campaign): Promise<void> {
    await this.createCampaignNotification(
      campaign,
      NotificationType.CAMPAIGN_COMPLETED,
      'Campaign Completed',
      `Your campaign "${campaign.name}" has been completed successfully.`,
    );
  }

  /**
   * Notify when a campaign is started
   */
  async notifyCampaignStarted(campaign: Campaign): Promise<void> {
    await this.createCampaignNotification(
      campaign,
      NotificationType.CAMPAIGN_STARTED,
      'Campaign Started',
      `Your campaign "${campaign.name}" has been started and is now active.`,
    );
  }

  /**
   * Notify when a campaign is paused
   */
  async notifyCampaignPaused(campaign: Campaign): Promise<void> {
    await this.createCampaignNotification(
      campaign,
      NotificationType.CAMPAIGN_PAUSED,
      'Campaign Paused',
      `Your campaign "${campaign.name}" has been paused.`,
    );
  }

  /**
   * Notify when a campaign fails
   */
  async notifyCampaignFailed(campaign: Campaign, reason?: string): Promise<void> {
    await this.createCampaignNotification(
      campaign,
      NotificationType.CAMPAIGN_FAILED,
      'Campaign Failed',
      `Your campaign "${campaign.name}" has failed.${reason ? ` Reason: ${reason}` : ''}`,
    );
  }
}

