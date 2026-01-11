import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushNotificationsController } from './push-notifications.controller';
import { NotificationsRepository } from './notifications.repository';
import { NotificationEventService } from './services/notification-event.service';
import { PushNotificationService } from './services/push-notification.service';
import { PushSubscriptionRepository } from './push-subscription.repository';
import { Notification } from './entities/notification.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { WsModule } from 'src/resources/ws/ws.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Notification, PushSubscription]),
    WsModule,
    // CommonModule is @Global, so its services are available without importing
  ],
  controllers: [NotificationsController, PushNotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationEventService,
    PushNotificationService,
    PushSubscriptionRepository,
  ],
  exports: [NotificationsService, NotificationEventService, PushNotificationService],
})
export class NotificationsModule {}

