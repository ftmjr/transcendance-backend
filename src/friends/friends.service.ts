import { Injectable } from '@nestjs/common';
import { FriendsRepository } from './friends.repository';
import { InvalidRequestError } from 'express-oauth2-jwt-bearer';
import { Contact, ContactRequest } from '@prisma/client';
import { NotificationService } from '../message/notification.service';

export enum FriendshipStatus {
  Friends = 'friends',
  Pending = 'pending',
  NeedApproval = 'needApproval',
  None = 'none',
}

@Injectable()
export class FriendsService {
  constructor(
    private repository: FriendsRepository,
    private notificationService: NotificationService,
  ) {}
  async getFriends(userId: number) {
    return this.repository.getFriends(userId);
  }

  async checkFriend(
    userId: number,
    friendId: number,
  ): Promise<{
    status: FriendshipStatus;
    data: Contact | ContactRequest | null;
  }> {
    const friend = await this.repository.getFriend(userId, friendId);
    if (!friend) {
      // check for pending request
      const requestSent = await this.repository.getSentFriendRequests(userId);
      const request = requestSent.find((r) => r.receiverId === friendId);
      if (request) {
        return {
          status: FriendshipStatus.Pending,
          data: request,
        };
      }
      const requestReceived = await this.repository.getReceivedFriendRequests(
        userId,
      );
      const request2 = requestReceived.find((r) => r.senderId === friendId);
      if (request2) {
        return {
          status: FriendshipStatus.NeedApproval,
          data: request2,
        };
      }
      return {
        status: FriendshipStatus.None,
        data: null,
      };
    }
    return {
      status: FriendshipStatus.Friends,
      data: friend,
    };
  }
  async getSentFriendRequests(userId: number) {
    return this.repository.getSentFriendRequests(userId);
  }
  async getReceivedFriendRequests(userId: number) {
    return this.repository.getReceivedFriendRequests(userId);
  }
  async removeFriend(userId: number, friendId: number) {
    return this.repository.removeFriend(userId, friendId);
  }
  async removeRequest(userId: number, friendId: number) {
    return this.repository.removeRequest(userId, friendId);
  }
  async addFriendRequest(userId: number, friendId: number) {
    const friend = await this.repository.getFriend(userId, friendId);
    if (friend) {
      throw new InvalidRequestError('User is already your friend');
    }
    await this.notificationService.createFriendRequestNotification(
      userId,
      friendId,
      `Tu as reçu une demande d'ami`,
    );
    return this.repository.addFriendRequest(userId, friendId);
  }
  async cancelFriendRequest(requestId: number) {
    return this.repository.cancelFriendRequest(requestId);
  }
  async approveFriendRequest(requestId: number) {
    const request = await this.repository.approveFriendRequest(requestId);
    await this.notificationService.createFriendRequestAcceptedNotification(
      request.userId,
      request.contactId,
      `Ta demande d'ami a été acceptée`,
    );
    return request;
  }
  async rejectFriendRequest(requestId: number) {
    const request = await this.repository.rejectFriendRequest(requestId);
    await this.notificationService.createFriendRequestRejectedNotification(
      request.senderId,
      request.receiverId,
      'Your friend request has been rejected',
    );
    return this.repository.rejectFriendRequest(requestId);
  }
}
