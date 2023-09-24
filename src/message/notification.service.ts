import { Injectable } from '@nestjs/common';
import { NotificationRepository } from './notification.repository';
import {
  Notification,
  NotificationType,
  NotificationStatus,
  User,
  Game,
} from '@prisma/client';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async createGameNotification(
    userId: User[`id`],
    gameId: Game[`id`],
    message: string,
  ): Promise<Notification> {
    const notification = this.notificationRepository.createNotification({
      user: { connect: { id: userId } },
      type: NotificationType.GAME_INVITE,
      title: 'Game Invite',
      message: message,
      referenceId: gameId,
    });
    this.notificationGateway.sendNotificationToUser(userId, notification);
    return notification;
  }

  async createFriendRequestNotification(
    userId: User[`id`],
    friendId: User[`id`],
    message: string,
  ): Promise<Notification> {
    const notification = this.notificationRepository.createNotification({
      user: { connect: { id: userId } },
      type: NotificationType.FRIEND_REQUEST,
      title: 'Friend Request',
      message: message,
      referenceId: friendId,
    });
    this.notificationGateway.sendNotificationToUser(userId, notification);
    return notification;
  }

  async createChatJoinNotification(
    userId: User[`id`],
    roomId: number,
    message: string,
  ): Promise<Notification> {
    const notification = this.notificationRepository.createNotification({
      user: { connect: { id: userId } },
      type: NotificationType.PRIVATE_MESSAGE,
      title: 'Ajouté à un chat privé',
      message: message,
      referenceId: roomId,
    });
    this.notificationGateway.sendNotificationToUser(userId, notification);
    return notification;
  }

  async markNotificationAsRead(notificationId: number): Promise<Notification> {
    return this.notificationRepository.markNotificationAsRead(notificationId);
  }

  async deleteNotification(notificationId: number): Promise<Notification> {
    return this.notificationRepository.deleteNotification(notificationId);
  }
}
