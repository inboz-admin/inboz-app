import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Delete,
  Query,
  Body,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Controller()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  // Specific routes MUST come before generic routes
  @Get('unread-count')
  getUnreadCount() {
    return this.notificationsService.getUnreadCount();
  }


  // Generic routes come after specific routes
  @Get()
  findAll(@Query() query: NotificationQueryDto) {
    return this.notificationsService.getUserNotifications({
      page: query.page,
      limit: query.limit,
      read: query.read,
    });
  }

  // Specific routes MUST come before parameterized routes
  @Patch('read-all')
  markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }

  // Parameterized routes come after specific routes
  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationsService.deleteNotification(id);
  }
}

