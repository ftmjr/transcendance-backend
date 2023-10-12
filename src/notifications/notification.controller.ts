import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { AuthenticatedGuard } from '../auth/guards';
import { NotificationService } from './notification.service';
import * as express from 'express';
import { RequestWithUser } from '../users/users.controller';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(AuthenticatedGuard)
  @Get()
  async getNotifications(@Req() req: RequestWithUser) {
    return this.notificationService.getNotificationsForUser(req.user.id);
  }

  @UseGuards(AuthenticatedGuard)
  @Delete(':notificationId')
  async deleteNotification(
    @Param('notificationId', ParseIntPipe) notificationId: number,
    @Req() req: RequestWithUser,
  ) {
    return this.notificationService.deleteNotification(notificationId);
  }

  @UseGuards(AuthenticatedGuard)
  @Post(':notificationId')
  async markNotificationAsRead(
    @Param('notificationId', ParseIntPipe) notificationId: number,
    @Req() req: RequestWithUser,
  ) {
    return this.notificationService.markNotificationAsRead(notificationId);
  }
}
