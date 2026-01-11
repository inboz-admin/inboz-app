import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BaseService } from 'src/common/services/base.service';
import { Notification } from './entities/notification.entity';
import { NotificationsRepository } from './notifications.repository';
import { UserContextService } from 'src/common/services/user-context.service';
import { TransactionManager } from 'src/common/services/transaction-manager.service';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { PushSubscriptionRepository } from './push-subscription.repository';
import { CreatePushSubscriptionDto } from './dto/create-push-subscription.dto';

@Injectable()
export class NotificationsService extends BaseService<Notification> {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly userContextService: UserContextService,
    private readonly transactionManager: TransactionManager,
    private readonly pushSubscriptionRepository: PushSubscriptionRepository,
  ) {
    super(notificationsRepository);
  }

  /**
   * Create a notification
   */
  async createNotification(
    data: {
      organizationId: string;
      userId: string | null;
      type: NotificationType;
      title: string;
      message: string;
      data?: any;
    },
    transaction?: any,
  ): Promise<Notification> {
    return this.transactionManager.execute(async (t) => {
      const currentUserId = this.userContextService.getCurrentUserId();
      const notification = await this.notificationsRepository.create(
        {
          ...data,
          createdBy: currentUserId,
        } as Partial<Notification>,
        t || transaction,
        currentUserId,
      );

      this.logger.log(
        `Notification created: ${notification.id} for user ${data.userId}`,
      );
      return notification;
    }, transaction);
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(options?: {
    page?: number;
    limit?: number;
    read?: boolean | null;
  }): Promise<{ data: Notification[]; total: number; page: number; limit: number }> {
    const userId = this.userContextService.getCurrentUserId();
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;

    const { rows, count } = await this.notificationsRepository.findUserNotifications(
      userId,
      {
        limit,
        offset,
        read: options?.read,
      },
    );

    // Convert Sequelize instances to plain objects to ensure proper date serialization
    const plainRows = rows.map((row: any) => {
      const plain = row.get ? row.get({ plain: true }) : row;
      // Ensure dates are properly serialized
      if (plain.createdAt) plain.createdAt = new Date(plain.createdAt).toISOString();
      if (plain.updatedAt) plain.updatedAt = new Date(plain.updatedAt).toISOString();
      if (plain.readAt) plain.readAt = new Date(plain.readAt).toISOString();
      return plain;
    });

    return {
      data: plainRows,
      total: count,
      page,
      limit,
    };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const userId = this.userContextService.getCurrentUserId();
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    const notification = (await this.notificationsRepository.findById(notificationId)) as Notification | null;
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    if (notification.userId !== userId) {
      throw new BadRequestException('You can only mark your own notifications as read');
    }

    const updatedCount = await this.notificationsRepository.markAsRead(
      notificationId,
      userId,
    );

    if (updatedCount === 0) {
      throw new BadRequestException('Notification is already read or does not exist');
    }

    return this.notificationsRepository.findById(notificationId) as Promise<Notification>;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(): Promise<{ count: number }> {
    const userId = this.userContextService.getCurrentUserId();
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    const count = await this.notificationsRepository.markAllAsRead(userId);
    this.logger.log(`Marked ${count} notifications as read for user ${userId}`);
    return { count };
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(): Promise<{ count: number }> {
    const userId = this.userContextService.getCurrentUserId();
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    const count = await this.notificationsRepository.getUnreadCount(userId);
    return { count };
  }

  /**
   * Delete a notification (soft delete)
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const userId = this.userContextService.getCurrentUserId();
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    const notification = (await this.notificationsRepository.findById(notificationId)) as Notification | null;
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    if (notification.userId !== userId) {
      throw new BadRequestException('You can only delete your own notifications');
    }

    await this.notificationsRepository.delete({ id: notificationId } as any);
    this.logger.log(`Notification ${notificationId} deleted by user ${userId}`);
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(dto: CreatePushSubscriptionDto): Promise<{ success: boolean; message: string }> {
    const userId = this.userContextService.getCurrentUserId();
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    const organizationId = this.userContextService.getCurrentUser().organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization not found');
    }

    // Check if subscription already exists for this user
    const existingForUser = await this.pushSubscriptionRepository.findByUserId(userId);
    const existingSubscription = existingForUser.find(sub => sub.endpoint === dto.endpoint);
    
    if (existingSubscription) {
      this.logger.log(`Push subscription already exists for user ${userId} with endpoint: ${dto.endpoint}`);
      return { success: true, message: 'Subscription already exists' };
    }

    // Check if endpoint exists for a different user (same browser, different user)
    const existingByEndpoint = await this.pushSubscriptionRepository.findByEndpoint(dto.endpoint);
    if (existingByEndpoint && existingByEndpoint.userId !== userId) {
      this.logger.log(`Endpoint ${dto.endpoint} exists for different user. Updating to current user ${userId}`);
      // Delete old subscription and create new one for current user
      await this.transactionManager.execute(async (transaction) => {
        // Soft delete old subscription
        await this.pushSubscriptionRepository.deleteByEndpoint(dto.endpoint, existingByEndpoint.userId);
        
        // Create new subscription for current user
        await this.pushSubscriptionRepository.create(
          {
            userId,
            organizationId,
            endpoint: dto.endpoint,
            p256dhKey: dto.keys.p256dh,
            authKey: dto.keys.auth,
            userAgent: null,
          },
          transaction,
          userId,
        );
      });
      this.logger.log(`Push subscription updated for user ${userId}`);
      return { success: true, message: 'Subscription updated successfully' };
    }

    // Create new subscription
    await this.transactionManager.execute(async (transaction) => {
      await this.pushSubscriptionRepository.create(
        {
          userId,
          organizationId,
          endpoint: dto.endpoint,
          p256dhKey: dto.keys.p256dh,
          authKey: dto.keys.auth,
          userAgent: null, // Will be set from request headers if needed
        },
        transaction,
        userId,
      );
    });

    this.logger.log(`Push subscription created for user ${userId}`);
    return { success: true, message: 'Subscription created successfully' };
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(endpoint: string): Promise<{ success: boolean; message: string }> {
    const userId = this.userContextService.getCurrentUserId();
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    const deleted = await this.pushSubscriptionRepository.deleteByEndpoint(endpoint, userId);
    if (deleted > 0) {
      this.logger.log(`Push subscription deleted for user ${userId}`);
      return { success: true, message: 'Unsubscribed successfully' };
    }

    return { success: false, message: 'Subscription not found' };
  }

  /**
   * Check if current user is subscribed to push notifications
   */
  async isUserSubscribed(): Promise<{ subscribed: boolean; endpoint?: string }> {
    const userId = this.userContextService.getCurrentUserId();
    if (!userId) {
      return { subscribed: false };
    }

    const subscriptions = await this.pushSubscriptionRepository.findByUserId(userId);
    if (subscriptions.length > 0) {
      return { subscribed: true, endpoint: subscriptions[0].endpoint };
    }

    return { subscribed: false };
  }
}

