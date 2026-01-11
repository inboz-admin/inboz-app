import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { InjectModel } from '@nestjs/sequelize';
import { Notification } from './entities/notification.entity';
import { UserContextService } from 'src/common/services/user-context.service';
import { Op, Transaction } from 'sequelize';

@Injectable()
export class NotificationsRepository extends BaseRepository<Notification> {
  constructor(
    @InjectModel(Notification)
    notificationModel: typeof Notification,
    userContextService: UserContextService,
  ) {
    super(notificationModel, undefined, userContextService);
  }

  /**
   * Find unread notifications for a user
   */
  async findUnreadByUserId(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      transaction?: Transaction;
    },
  ): Promise<Notification[]> {
    const { limit, offset, transaction } = options || {};
    return this.model.findAll({
      where: {
        userId,
        readAt: null,
        deletedAt: null,
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      transaction,
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(
    notificationId: string,
    userId: string,
    transaction?: Transaction,
  ): Promise<number> {
    const [updatedCount] = await this.model.update(
      {
        readAt: new Date(),
        readBy: userId,
      },
      {
        where: {
          id: notificationId,
          userId,
          readAt: null,
        },
        transaction,
      },
    );
    return updatedCount;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(
    userId: string,
    transaction?: Transaction,
  ): Promise<number> {
    const currentUserId = this.getCurrentUserId();
    const [updatedCount] = await this.model.update(
      {
        readAt: new Date(),
        readBy: currentUserId || userId,
      },
      {
        where: {
          userId,
          readAt: null,
        },
        transaction,
      },
    );
    return updatedCount;
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(
    userId: string,
    transaction?: Transaction,
  ): Promise<number> {
    return this.model.count({
      where: {
        userId,
        readAt: null,
        deletedAt: null,
      },
      transaction,
    });
  }

  /**
   * Find notifications for a user with pagination
   */
  async findUserNotifications(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      read?: boolean | null; // null = all, true = read only, false = unread only
      transaction?: Transaction;
    },
  ): Promise<{ rows: Notification[]; count: number }> {
    const { limit, offset, read, transaction } = options || {};
    const where: any = {
      userId,
      deletedAt: null,
    };

    if (read !== null && read !== undefined) {
      if (read) {
        where.readAt = { [Op.ne]: null };
      } else {
        where.readAt = null;
      }
    }

    const { rows, count } = await this.model.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      transaction,
    });

    return { rows, count };
  }
}

