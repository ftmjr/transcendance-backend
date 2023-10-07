import { Injectable } from '@nestjs/common';
import { NotificationRepository } from './notification.repository';
import {
  Notification,
  NotificationType,
  NotificationStatus,
  User,
  Game,
  ContactRequest,
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
  ): Promise<void> {
    this.notificationRepository
      .createNotification({
        user: { connect: { id: userId } },
        type: NotificationType.GAME_INVITE,
        title: 'Game Invite',
        message: message,
        referenceId: gameId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minutes
      })
      .then((notification) => {
        this.notificationGateway.sendNotificationToUser(userId, notification);
      })
      .catch((e) => {
        console.error(e);
      });
  }

  async createChallengeAcceptedNotification(
    userId: number,
    gameId: number,
    message: string,
  ): Promise<void> {
    this.notificationRepository
      .createNotification({
        user: { connect: { id: userId } },
        type: NotificationType.GAME_INVITE,
        title: 'Challenge Accepted',
        message: message,
        referenceId: gameId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day
      })
      .then((notification) => {
        this.notificationGateway.sendNotificationToUser(userId, notification);
      });
  }

  async createFriendRequestNotification(
    friendId: User[`id`],
    requestId: ContactRequest[`id`],
    message: string,
  ): Promise<void> {
    this.notificationRepository
      .createNotification({
        user: { connect: { id: friendId } },
        type: NotificationType.FRIEND_REQUEST,
        title: 'Friend Request',
        message: message,
        referenceId: requestId,
      })
      .then((notification) => {
        this.notificationGateway.sendNotificationToUser(friendId, notification);
      });
  }

  async createFriendRequestAcceptedNotification(
    userId: User[`id`],
    friendId: User[`id`],
    message: string,
  ): Promise<void> {
    this.notificationRepository
      .createNotification({
        user: { connect: { id: userId } },
        type: NotificationType.FRIEND_REQUEST,
        title: 'Friend Request Accepted',
        message: message,
        referenceId: friendId,
      })
      .then((notification) => {
        this.notificationGateway.sendNotificationToUser(userId, notification);
      });
  }

  async createFriendRequestRejectedNotification(
    userId: User[`id`],
    friendId: User[`id`],
    message: string,
  ): Promise<void> {
    this.notificationRepository
      .createNotification({
        user: { connect: { id: userId } },
        type: NotificationType.FRIEND_REQUEST,
        title: 'Friend Request Rejected',
        message: message,
        referenceId: friendId,
      })
      .then((notification) => {
        this.notificationGateway.sendNotificationToUser(userId, notification);
      });
  }

  async createChatJoinNotification(
    userId: User[`id`],
    roomId: number,
    message: string,
  ) {
    this.notificationRepository
      .createNotification({
        user: { connect: { id: userId } },
        type: NotificationType.PRIVATE_MESSAGE,
        title: 'Added to Chat',
        message: message,
        referenceId: roomId,
      })
      .then((notification) => {
        this.notificationGateway.sendNotificationToUser(userId, notification);
      });
  }

  async getNotificationsForUser(userId: number): Promise<Notification[]> {
    return this.notificationRepository.getNotificationsForUser(userId);
  }

  async markNotificationAsRead(notificationId: number): Promise<Notification> {
    return this.notificationRepository.markNotificationAsRead(notificationId);
  }

  async deleteNotification(notificationId: number): Promise<Notification> {
    return this.notificationRepository.deleteNotification(notificationId);
  }
}
