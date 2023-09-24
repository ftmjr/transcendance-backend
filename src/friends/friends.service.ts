import { Injectable } from '@nestjs/common';
import { FriendsRepository } from './friends.repository';
import { UsersService, UserWithoutSensitiveInfo } from '../users/users.service';
import { InvalidRequestError } from 'express-oauth2-jwt-bearer';
import { Contact, ContactRequest } from '@prisma/client';

export enum FriendshipStatus {
  Friends = 'friends',
  Pending = 'pending',
  NeedApproval = 'needApproval',
  None = 'none',
}

@Injectable()
export class FriendsService {
  constructor(private repository: FriendsRepository) {}
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
    return this.repository.addFriendRequest(userId, friendId);
  }
  async cancelFriendRequest(requestId: number) {
    return this.repository.cancelFriendRequest(requestId);
  }
  async approveFriendRequest(requestId: number) {
    return this.repository.approveFriendRequest(requestId);
  }
  async rejectFriendRequest(requestId: number) {
    return this.repository.rejectFriendRequest(requestId);
  }
}
