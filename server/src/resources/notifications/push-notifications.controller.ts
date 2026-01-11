import { Controller, Get, Post, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './services/push-notification.service';
import { CreatePushSubscriptionDto } from './dto/create-push-subscription.dto';

@Controller('push')
export class PushNotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Get('vapid-key')
  getVapidKey() {
    const publicKey = this.pushNotificationService.getVapidPublicKey();
    if (!publicKey) {
      throw new Error('VAPID keys not configured on server');
    }
    // Return just the data - SuccessInterceptor will wrap it
    return { publicKey };
  }

  @Post('subscribe')
  async subscribe(@Body() dto: CreatePushSubscriptionDto) {
    return this.notificationsService.subscribeToPush(dto);
  }

  @Post('unsubscribe')
  async unsubscribe(@Body() body: { endpoint: string }) {
    return this.notificationsService.unsubscribeFromPush(body.endpoint);
  }

  @Get('status')
  async getStatus() {
    return this.notificationsService.isUserSubscribed();
  }
}

