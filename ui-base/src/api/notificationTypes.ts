export enum NotificationType {
  CAMPAIGN_COMPLETED = 'CAMPAIGN_COMPLETED',
  CAMPAIGN_STARTED = 'CAMPAIGN_STARTED',
  CAMPAIGN_PAUSED = 'CAMPAIGN_PAUSED',
  CAMPAIGN_FAILED = 'CAMPAIGN_FAILED',
}

export interface Notification {
  id: string;
  organizationId: string;
  userId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  data?: {
    campaignId?: string;
    campaignName?: string;
    campaignStatus?: string;
    [key: string]: any;
  };
  readAt: string | null;
  readBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  read?: boolean | null;
}

