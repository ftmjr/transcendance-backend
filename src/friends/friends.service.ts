import { Injectable } from '@nestjs/common';
import { FriendsRepository } from './friends.repository';
import { UsersService } from '../users/users.service';
import { InvalidRequestError } from 'express-oauth2-jwt-bearer';

@Injectable()
export class FriendsService {
  constructor(private repository: FriendsRepository) {}
  async getFriends(userId: number) {
    return this.repository.getFriends(userId);
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
