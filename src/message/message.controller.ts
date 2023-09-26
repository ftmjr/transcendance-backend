import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto';
import { PrivateMessage, User } from '@prisma/client';
import { AuthenticatedGuard } from '../auth/guards';
import { UserWithoutSensitiveInfo } from '../users/users.service';
import { NotificationService } from './notification.service';
import * as express from 'express';

type RequestWithUser = express.Request & { user: User };
@Controller('messages')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly notificationService: NotificationService,
  ) {}

  @UseGuards(AuthenticatedGuard)
  @Post()
  async createPrivateMessage(
    @Body() createMessageDto: CreateMessageDto,
    @Req() req: any,
  ): Promise<PrivateMessage> {
    return this.messageService.createPrivateMessage(createMessageDto, req.user);
  }

  @UseGuards(AuthenticatedGuard)
  @Get('private/:userTwoId')
  async getPrivateMessages(
    @Param('userTwoId') userTwoId: number,
    @Query('skip') skip: number,
    @Query('take') take: number,
    @Req() req: any,
  ): Promise<PrivateMessage[]> {
    return this.messageService.getPrivateMessages(req.user.id, userTwoId, {
      skip,
      take,
    });
  }

  @UseGuards(AuthenticatedGuard)
  @Get('conversations')
  async getUniqueConversations(
    @Req() req: any,
  ): Promise<UserWithoutSensitiveInfo[]> {
    return this.messageService.getUniqueConversations(req.user.id);
  }

  @UseGuards(AuthenticatedGuard)
  @Get('notifications')
  async getNotifications(@Req() req: RequestWithUser) {
    return this.notificationService.getNotificationsForUser(req.user.id);
  }

  @UseGuards(AuthenticatedGuard)
  @Delete('notifications/:notificationId')
  async deleteNotification(
    @Param('notificationId', ParseIntPipe) notificationId: number,
    @Req() req: RequestWithUser,
  ) {
    return this.notificationService.deleteNotification(notificationId);
  }

  @UseGuards(AuthenticatedGuard)
  @Post('notifications/:notificationId')
  async markNotificationAsRead(
    @Param('notificationId', ParseIntPipe) notificationId: number,
    @Req() req: RequestWithUser,
  ) {
    return this.notificationService.markNotificationAsRead(notificationId);
  }
}
