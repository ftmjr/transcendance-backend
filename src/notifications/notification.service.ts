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

  async createGameStartedNotification(
    userId: User[`id`],
    gameId: Game[`id`],
    message: string,
  ): Promise<void> {
    this.notificationRepository
      .createNotification({
        user: { connect: { id: userId } },
        type: NotificationType.GAME_EVENT,
        title: 'Game Started',
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

  async createGameMatchedNotification(
    userId: User[`id`],
    gameId: Game[`id`],
    message: string,
  ): Promise<void> {
    this.notificationRepository
      .createNotification({
        user: { connect: { id: userId } },
        type: NotificationType.GAME_EVENT,
        title: 'Game Matched',
        message: message,
        referenceId: gameId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 1), // 1 minutes
      })
      .then((notification) => {
        this.notificationGateway.sendNotificationToUser(userId, notification);
      })
      .catch((e) => {
        console.error(e);
      });
  }

  async createGameInviteRejectedNotification(
    userId: User[`id`],
    gameId: Game[`id`],
    message: string,
  ): Promise<void> {
    this.notificationRepository
      .createNotification({
        user: { connect: { id: userId } },
        type: NotificationType.GAME_INVITE,
        title: 'Game Invite Rejected',
        message: message,
        referenceId: gameId,
      })
      .then((notification) => {
        this.notificationGateway.sendNotificationToUser(userId, notification);
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
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 1), // 1h
      })
      .then((notification) => {
        this.notificationGateway.sendNotificationToUser(userId, notification);
      });
  }

  async createHasJoinedGameNotification(
    userId: number,
    gameId: number,
    message: string,
  ): Promise<void> {
    this.notificationRepository
      .createNotification({
        user: { connect: { id: userId } },
        type: NotificationType.GAME_EVENT,
        title: 'Joined Game',
        message: message,
        referenceId: gameId,
      })
      .then((notification) => {
        this.notificationGateway.sendNotificationToUser(userId, notification);
      });
  }

  async createFriendRequestNotification(
    sourceUserId: User[`id`],
    friendId: User[`id`],
    message: string,
  ): Promise<void> {
    this.notificationRepository
      .createNotification({
        user: { connect: { id: friendId } },
        type: NotificationType.FRIEND_REQUEST,
        title: `Demande d'amitié`,
        message: message,
        referenceId: sourceUserId,
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
        title: `Demande d'ami acceptée`,
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
        title: `Demande d'ami refusée`,
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

  // notification when a room is destroyed
  async createChatRoomDestroyedNotification(
    members: Array<User[`id`]>,
    roomId: number,
    message: string,
  ) {
    const notificationsCreatedPromises = members.map((member) => {
      return this.notificationRepository.createNotification({
        user: { connect: { id: member } },
        type: NotificationType.PRIVATE_MESSAGE,
        title: 'Chat Room Destroyed',
        message: message,
        referenceId: roomId,
      });
    });
    Promise.all(notificationsCreatedPromises).then((notifications) => {
      notifications.forEach((notification) => {
        this.notificationGateway.sendNotificationToUser(
          notification.userId,
          notification,
        );
      });
    });
  }

  // create notification when a user is promoted in a room
  async createChatRoomPromotionNotification(
    userId: User[`id`],
    roomId: number,
    message: string,
  ) {
    this.notificationRepository
      .createNotification({
        user: { connect: { id: userId } },
        type: NotificationType.PRIVATE_MESSAGE,
        title: 'Promoted in Chat Room',
        message: message,
        referenceId: roomId,
      })
      .then((notification) => {
        this.notificationGateway.sendNotificationToUser(userId, notification);
      });
  }

  // create notification when removed from a room
  async createChatRoomRemovedNotification(
    userId: User[`id`],
    roomId: number,
    message: string,
  ) {
    this.notificationRepository
      .createNotification({
        user: { connect: { id: userId } },
        type: NotificationType.PRIVATE_MESSAGE,
        title: 'Removed from Chat Room',
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
