import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Subscription, SubscriptionStatus } from '../entities/subscription.entity';
import { SubscriptionsService } from '../subscriptions.service';

@Injectable()
export class SubscriptionExpiryService {
  private readonly logger = new Logger(SubscriptionExpiryService.name);

  constructor(
    @InjectModel(Subscription)
    private readonly subscriptionModel: typeof Subscription,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * Check for expired subscriptions and handle them
   */
  async checkExpiredSubscriptions(): Promise<void> {
    try {
      const now = new Date();

      // Find subscriptions that have expired (past currentPeriodEnd)
      const expiredSubscriptions = await this.subscriptionModel.findAll({
        where: {
          currentPeriodEnd: {
            [Op.lt]: now,
          },
          status: {
            [Op.in]: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
          },
        },
      });

      this.logger.log(`Found ${expiredSubscriptions.length} expired subscriptions to process`);

      for (const subscription of expiredSubscriptions) {
        if (subscription.status === SubscriptionStatus.TRIAL) {
          await this.handleTrialExpiry(subscription.id);
        } else {
          await this.handleSubscriptionExpiry(subscription.id);
        }
      }
    } catch (error) {
      this.logger.error('Error checking expired subscriptions:', error);
    }
  }

  /**
   * Handle trial expiry - convert to CANCELLED
   */
  async handleTrialExpiry(subscriptionId: string): Promise<void> {
    try {
      const subscription = await this.subscriptionModel.findByPk(subscriptionId);

      if (!subscription || subscription.status !== SubscriptionStatus.TRIAL) {
        return;
      }

      await this.subscriptionModel.update(
        {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
        },
        {
          where: { id: subscriptionId },
        },
      );

      this.logger.log(`Trial subscription ${subscriptionId} expired and cancelled`);
    } catch (error) {
      this.logger.error(`Error handling trial expiry for subscription ${subscriptionId}:`, error);
    }
  }

  /**
   * Handle paid subscription expiry - cancel if no renewal payment
   */
  async handleSubscriptionExpiry(subscriptionId: string): Promise<void> {
    try {
      const subscription = await this.subscriptionModel.findByPk(subscriptionId);

      if (!subscription) {
        return;
      }

      // If subscription has cancelAt set, don't auto-cancel here (let processScheduledCancellations handle it)
      if (subscription.cancelAt) {
        return;
      }

      // Mark as CANCELLED if expired without renewal
      await this.subscriptionModel.update(
        {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
        },
        {
          where: { id: subscriptionId },
        },
      );

      this.logger.log(`Subscription ${subscriptionId} expired and cancelled`);
    } catch (error) {
      this.logger.error(`Error handling subscription expiry for ${subscriptionId}:`, error);
    }
  }

  /**
   * Process subscriptions where cancelAt date has passed
   */
  async processScheduledCancellations(): Promise<void> {
    try {
      const now = new Date();

      const subscriptionsToCancel = await this.subscriptionModel.findAll({
        where: {
          cancelAt: {
            [Op.lte]: now,
          },
          status: {
            [Op.ne]: SubscriptionStatus.CANCELLED,
          },
        },
      });

      this.logger.log(`Found ${subscriptionsToCancel.length} subscriptions to cancel (cancelAt date passed)`);

      for (const subscription of subscriptionsToCancel) {
        await this.subscriptionModel.update(
          {
            status: SubscriptionStatus.CANCELLED,
            cancelledAt: new Date(),
          },
          {
            where: { id: subscription.id },
          },
        );

        this.logger.log(`Subscription ${subscription.id} cancelled (cancelAt date passed)`);
      }
    } catch (error) {
      this.logger.error('Error processing scheduled cancellations:', error);
    }
  }

  /**
   * Send expiry notifications (placeholder - implement email service integration)
   */
  async sendExpiryNotifications(): Promise<void> {
    try {
      const now = new Date();
      const sevenDaysFromNow = new Date(now);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      // Find subscriptions expiring in 7 days
      const expiringSubscriptions = await this.subscriptionModel.findAll({
        where: {
          currentPeriodEnd: {
            [Op.between]: [now, sevenDaysFromNow],
          },
          status: {
            [Op.in]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
          },
        },
      });

      this.logger.log(`Found ${expiringSubscriptions.length} subscriptions expiring in 7 days`);

      // TODO: Implement email notification service
      // for (const subscription of expiringSubscriptions) {
      //   await this.emailService.sendExpiryReminder(subscription);
      // }
    } catch (error) {
      this.logger.error('Error sending expiry notifications:', error);
    }
  }
}



