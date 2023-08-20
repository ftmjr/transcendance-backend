import {Injectable, NotFoundException, UnauthorizedException} from '@nestjs/common';
import { ChatRealtimeRepository } from './chatRealtime.repository';
import { CreateRoomDto } from './dto/createRoom.dto';
import { Status, Prisma, User, Role } from '@prisma/client';
import {
  ClientToServerEvents,
  NewRoom,
  ServerToClientEvents,
} from './interfaces/chat.interface';
import { JoinRoomDto } from './dto/joinRoom.dto';
import { ChatRealtimeGateway } from './chatRealtime.gateway';
import { UserActionDto } from './dto/userAction.dto';
import { WebSocketServer } from '@nestjs/websockets';
import {Server, Socket} from 'socket.io';
import * as argon from "argon2";
import {UsersService} from "../users/users.service";

function exclude<ChatRoom, Key extends keyof ChatRoom>(
  room: ChatRoom,
  keys: Key[],
): Omit<ChatRoom, Key> {
  for (const key of keys) {
    delete room[key];
  }
  return room;
}

@Injectable()
export class ChatRealtimeService {
  constructor(
    private repository: ChatRealtimeRepository,
    private usersService: UsersService,
  ) {}
  async getRooms({ skip, take }, userId: number) {
    const banRooms = await this.repository.findBanFrom(userId);
    const banRoomIds = banRooms.map((banRoom) => banRoom.chatroomId);
    const userMemberships = await this.repository.getMemberRooms(userId);
    const userMembershipRoomIds = userMemberships.map((membership) => membership.id);
    const rooms = await this.repository.getRooms({
      where: {
        OR: [
          {
            private: false,
            id: {
              not: {
                in: banRoomIds,
              },
            },
          },
          {
            private: true,
            id: {
              in: userMembershipRoomIds,
            },
          },
        ],
      },
      skip,
      take,
    });
    return rooms.map((room) => exclude(room, ['password']));
  }
  async filterRoomMembers(members, user) {
    const blockedUserIds = user.blockedUsers.map(
      (blockedUser) => blockedUser.blockedUserId,
    );
    const blockedFromIds = user.blockedFrom.map(
      (blockedFrom) => blockedFrom.userId,
    );
    return members.filter((member) => {
      return (
        !blockedUserIds.includes(member.memberId) &&
        !blockedFromIds.includes(member.memberId)
      );
    });
  }
  async filterMessages(messages, user) {
    const blockedUserIds = user.blockedUsers.map(
      (blockedUser) => blockedUser.blockedUserId,
    );
    const blockedFromIds = user.blockedFrom.map(
      (blockedFrom) => blockedFrom.userId,
    );
    return messages.filter((message) => {
      return (
        !blockedUserIds.includes(message.userId) &&
        !blockedFromIds.includes(message.userId)
      );
    });
  }
  async getRoomMembers({ skip, take }, user: any, roomId: number) {
    const userMember = await this.repository.findMember(user.id, roomId);
    if (!userMember) {
      throw new UnauthorizedException('User not in the chat room');
    } else if (userMember.role === Role.BAN) {
      throw new UnauthorizedException('User is Ban');
    }
    const members = await this.repository.getRoomMembers(roomId);
    return await this.filterRoomMembers(members, user);
  }
  async getRoomMessages({ skip, take }, user: any, roomId: number) {
    const userMember = await this.repository.findMember(user.id, roomId);
    if (!userMember) {
      throw new UnauthorizedException('User not in the chat room');
    } else if (userMember.role === Role.BAN) {
      throw new UnauthorizedException('User is Ban');
    }
    const messages = await this.repository.getRoomMessages(roomId, {
      skip,
      take,
    });
    return await this.filterMessages(messages, user);
  }
  async getGeneralMessages({ skip, take }, user: any) {
    const messages = await this.repository.getGeneralMessages({ skip, take });
    return await this.filterMessages(messages, user);
  }

  async getRoomMember(userId: number, roomId: number) {
    return await this.repository.findMember(userId, roomId);
  }

  async createRoom(newRoom: CreateRoomDto) {
    const data: Prisma.ChatRoomCreateInput = {
      name: newRoom.name,
      private: newRoom.private,
      protected: newRoom.protected,
      password: '',
    };
    if (newRoom.protected) {
      data.password = await argon.hash(newRoom.password);
    }
    return await this.repository.createRoom({ data }, newRoom.ownerId);
  }

  async leaveRoom(user: User, roomId: number) {
    return await this.repository.leaveRoom(user, roomId);
  }
  async getRoom(roomName: string) {
    return await this.repository.getRoom(roomName);
  }
  async verifyMember(userId: number, roomId: number) {
    const user = await this.repository.getChatRoomMember(userId, roomId);
    if (!user) {
      throw new UnauthorizedException('User is not in chatroom');
    } else if (user.role === Role.BAN) {
      throw new UnauthorizedException('User is banned from chatroom');
    } else if (user.role === Role.USER) {
      throw new UnauthorizedException('User is only a user in the chatroom');
    }
    return user;
  }
  async createGeneralMessage(client: Socket, message: string) {
    return await this.repository.createGeneralMessage({
      data: {
        userId: client.data.user.id,
        content: message,
      },
    });
  }
  async createRoomMessage(client: Socket, message: string) {
    const room = await this.repository.getRoom(client.data.room);
    return await this.repository.createRoomMessage({
      data: {
        chatroomId: room.id,
        userId: client.data.user.id,
        content: message,
      },
    });
  }
  async joinRoom(data: JoinRoomDto) {
    const room = await this.repository.getRoom(data.roomName);
    if (!room) {
      throw new NotFoundException("Room doesn't exist");
    }
    if (room.protected) {
      const isValid = await argon.verify(room.password, data.password);
      if (!isValid) {
        throw new NotFoundException('Password invalid');
      }
    }
    const member = await this.repository.getChatRoomMember(
      data.userId,
      room.id,
    );
    if (!member) {
      return await this.repository.joinRoom(data, room.id);
    } else if (member.role === Role.BAN) {
      console.log('hey4');

      throw new NotFoundException('User is ban from room!');
    } else {
      return member;
    }
  }
  async joinGeneral(user: User) {
    const member = await this.repository.getGeneralMember(user.id);
    if (!member) {
      return await this.repository.createGeneralMember(user.id);
    }
    return member;
  }
  async kickChatRoomMember(otherId: number) {
    return await this.repository.kickChatRoomMember(otherId);
  }
  async muteChatRoomMember(otherId: number) {
    return await this.repository.updateChatRoomMember({
      where: {
        id: otherId,
      },
      data: {
        role: Role.MUTED,
      },
    });
  }
  async unmuteChatRoomMember(otherId: number) {
    return await this.repository.updateChatRoomMember({
      where: {
        id: otherId,
      },
      data: {
        role: Role.USER,
      },
    });
  }
  async banChatRoomMember(otherId: number) {
    return await this.repository.updateChatRoomMember({
      where: {
        id: otherId,
      },
      data: {
        role: Role.BAN,
      },
    });
  }
  async promoteChatRoomMember(otherId: number) {
    return await this.repository.updateChatRoomMember({
      where: {
        id: otherId,
      },
      data: {
        role: Role.ADMIN,
      },
    });
  }

  async getGeneralMembers({ skip, take }, user: any) {
    const members = await this.repository.getGeneralMembers({ skip, take });
    return await this.filterRoomMembers(members, user);
  }
}
