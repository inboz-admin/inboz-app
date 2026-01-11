import { apiService } from './apiService';
import type {
  Notification,
  NotificationResponse,
  UnreadCountResponse,
  GetNotificationsParams,
} from './notificationTypes';

class NotificationService {
  private baseUrl = '/notifications';

  async getNotifications(
    params?: GetNotificationsParams,
  ) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.read !== undefined && params.read !== null) {
      queryParams.append('read', params.read.toString());
    }

    const url = `${this.baseUrl}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<NotificationResponse>(url);
  }

  async getUnreadCount() {
    return apiService.get<UnreadCountResponse>(`${this.baseUrl}/unread-count`);
  }

  async markAsRead(notificationId: string) {
    return apiService.patch<Notification>(
      `${this.baseUrl}/${notificationId}/read`,
      {},
    );
  }

  async markAllAsRead() {
    return apiService.patch<{ count: number }>(`${this.baseUrl}/read-all`, {});
  }

  async deleteNotification(notificationId: string) {
    return apiService.delete(`${this.baseUrl}/${notificationId}`);
  }
}

export const notificationService = new NotificationService();

