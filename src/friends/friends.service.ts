import { Injectable } from '@nestjs/common';
import {
  ContactRequestWithReceiver,
  ContactRequestWithSender,
  FriendsRepository,
} from './friends.repository';
import { InvalidRequestError } from 'express-oauth2-jwt-bearer';
import { Contact, ContactRequest, User } from '@prisma/client';
import { NotificationService } from '../message/notification.service';
import { UsersService } from '../users/users.service';

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
    data:
      | Contact
      | ContactRequestWithSender
      | ContactRequestWithReceiver
      | null;
  }> {
    const friend = await this.repository.getFriend(userId, friendId);
    if (!friend) {
      // check for pending request userId sent to friendId
      const requestSent = await this.checkIfRequestWasSent(userId, friendId);
      if (requestSent) {
        return {
          status: FriendshipStatus.Pending,
          data: requestSent,
        };
      }
      // check for pending request friendId sent to userId
      const requestReceived = await this.checkIfRequestWasReceived(
        userId,
        friendId,
      );
      if (requestReceived) {
        return {
          status: FriendshipStatus.NeedApproval,
          data: requestReceived,
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

  async checkIfRequestWasSent(
    userId: number,
    friendId: number,
  ): Promise<ContactRequestWithReceiver | null> {
    const allRequestSent = await this.repository.getSentFriendRequests(userId);
    return allRequestSent.find((r) => r.receiverId === friendId);
  }

  async checkIfRequestWasReceived(
    userId: number,
    friendId: number,
  ): Promise<ContactRequestWithSender | null> {
    const requestReceived = await this.repository.getReceivedFriendRequests(
      userId,
    );
    return requestReceived.find((r) => r.senderId === friendId);
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
  async addFriendRequest(user: User, friendId: number) {
    const friend = await this.repository.getFriend(user.id, friendId);
    if (friend) {
      throw new InvalidRequestError('User is already your friend');
    }
    const contactRequest = await this.repository.addFriendRequest(
      user.id,
      friendId,
    );
    await this.notificationService.createFriendRequestNotification(
      friendId,
      contactRequest.id,
      `Tu as reçu une demande d'ami de ${user.username}`,
    );
    return contactRequest;
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
    return request;
  }
}
