import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContactRequest, Prisma, Profile } from '@prisma/client';

@Injectable()
export class FriendsRepository {
  constructor(private prisma: PrismaService) {}

  async getFriend(userId, friendId) {
    return await this.prisma.contact.findFirst({
      where: {
        OR: [
          {
            userId: userId,
            contactId: friendId,
          },
          {
            userId: friendId,
            contactId: userId,
          },
        ],
      },
    });
  }
  async getFriends(id: number) {
    const relations = await this.prisma.contact.findMany({
      where: {
        OR: [
          {
            userId: id,
          },
          {
            contactId: id,
          },
        ],
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        contact: {
          include: {
            profile: true,
          },
        },
      },
    });
    if (!relations) {
      return []; // No friends found
    }
    return relations.map((relation) => {
      if (relation.userId === id) {
        return relation.contact;
      } else {
        return relation.user;
      }
    });
  }
  async removeFriend(userId: number, friendId: number) {
    return this.prisma.contact.deleteMany({
      where: {
        OR: [
          {
            userId: userId,
            contactId: friendId,
          },
          {
            userId: friendId,
            contactId: userId,
          },
        ],
      },
    });
  }
  async addFriendRequest(userId: number, friendId: number) {
    return this.prisma.contactRequest.create({
      data: {
        senderId: userId,
        receiverId: friendId,
      },
    });
  }
  async getSentFriendRequests(id: number) {
    return await this.prisma.contactRequest.findMany({
      where: {
        senderId: id,
      },
      include: {
        receiver: {
          include: {
            profile: true,
          },
        },
      },
    });
  }
  async getReceivedFriendRequests(id: number) {
    return await this.prisma.contactRequest.findMany({
      where: {
        receiverId: id,
      },
      include: {
        sender: {
          include: {
            profile: true,
          },
        },
      },
    });
  }
  async cancelFriendRequest(requestId: number) {
    return this.prisma.contactRequest.delete({
      where: {
        id: requestId,
      },
    });
  }
  async approveFriendRequest(requestId: number) {
    const request = await this.prisma.contactRequest.findUnique({
      where: {
        id: requestId,
      },
    });
    const relation = await this.prisma.contact.create({
      data: {
        userId: request.senderId,
        contactId: request.receiverId,
      },
    });
    if (relation) {
      await this.prisma.contactRequest.delete({
        where: {
          id: requestId,
        },
      });
    }
    return relation;
  }
  async rejectFriendRequest(requestId: number) {
    return await this.prisma.contactRequest.delete({
      where: {
        id: requestId,
      },
    });
  }
}
