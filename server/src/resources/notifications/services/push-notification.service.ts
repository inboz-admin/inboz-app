import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PushSubscriptionRepository } from '../push-subscription.repository';
import { UserContextService } from 'src/common/services/user-context.service';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private vapidPublicKey: string | null = null;
  private vapidPrivateKey: string | null = null;

  constructor(
    private readonly pushSubscriptionRepository: PushSubscriptionRepository,
    private readonly userContextService: UserContextService,
    private readonly configService: ConfigService,
  ) {
    this.initializeVapid();
  }

  /**
   * Initialize VAPID keys
   */
  private initializeVapid() {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');

    if (publicKey && privateKey) {
      this.vapidPublicKey = publicKey;
      this.vapidPrivateKey = privateKey;
      webpush.setVapidDetails(
        this.configService.get<string>('VAPID_SUBJECT') || 'mailto:admin@inboz.com',
        publicKey,
        privateKey,
      );
      this.logger.log('✅ VAPID keys initialized');
    } else {
      this.logger.warn('⚠️ VAPID keys not configured. Push notifications will not work.');
    }
  }

  /**
   * Get VAPID public key
   */
  getVapidPublicKey(): string | null {
    return this.vapidPublicKey;
  }

  /**
   * Send push notification to a user
   */
  async sendPushNotification(
    userId: string,
    title: string,
    message: string,
    data?: any,
  ): Promise<void> {
    if (!this.vapidPublicKey || !this.vapidPrivateKey) {
      this.logger.warn('VAPID keys not configured, skipping push notification');
      return;
    }

    try {
      const subscriptions = await this.pushSubscriptionRepository.findByUserId(userId);

      if (subscriptions.length === 0) {
        this.logger.debug(`No push subscriptions found for user ${userId}`);
        return;
      }

      const payload = JSON.stringify({
        title,
        message,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: data?.id || 'notification',
        data: {
          ...data,
          url: data?.link || data?.url || '/dashboard',
        },
      });

      const promises = subscriptions.map(async (subscription) => {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dhKey,
              auth: subscription.authKey,
            },
          };

          await webpush.sendNotification(pushSubscription, payload);
          this.logger.log(`✅ Push notification sent to user ${userId}`);
        } catch (error: any) {
          this.logger.error(
            `❌ Failed to send push notification to user ${userId}:`,
            error.message,
          );

          // If subscription is invalid (410 Gone), delete it
          if (error.statusCode === 410) {
            this.logger.log(`Deleting invalid subscription for user ${userId}`);
            await this.pushSubscriptionRepository.deleteByEndpoint(
              subscription.endpoint,
              userId,
            );
          }
        }
      });

      await Promise.allSettled(promises);
    } catch (error: any) {
      this.logger.error(`Failed to send push notification to user ${userId}:`, error);
    }
  }
}

