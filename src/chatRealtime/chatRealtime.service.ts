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
  constructor(private repository: ChatRealtimeRepository) {}

  async getRooms({ skip, take }, userId: number) {
    const banRooms = await this.repository.findBanFrom(userId);
    const banRoomIds = banRooms.map((banRoom) => banRoom.chatroomId);
    const rooms = await this.repository.getRooms({
      where: {
        private: false,
        id: {
          not: {
            in: banRoomIds,
          },
        },
      },
      skip,
      take,
    });
    return rooms.map((room) => exclude(room, ['password']));
  }
  async getRoomMembers({ skip, take }, userId: number, roomId: number) {
    const userMember = await this.repository.findMember(userId, roomId);
    if (!userMember) {
      throw new UnauthorizedException('User not in the chat room');
    } else if (userMember.role === Role.BAN) {
      throw new UnauthorizedException('User is Ban');
    }
    return await this.repository.getRoomMembers(roomId);
  }
  async getRoomMessages({ skip, take }, userId: number, roomId: number) {
    const userMember = await this.repository.findMember(userId, roomId);
    if (!userMember) {
      throw new UnauthorizedException('User not in the chat room');
    } else if (userMember.role === Role.BAN) {
      throw new UnauthorizedException('User is Ban');
    }
    return await this.repository.getRoomMessages(roomId, { skip, take });
  }
  async getGeneralMessages({ skip, take }) {
    return await this.repository.getGeneralMessages({ skip, take });
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
  async kickChatRoomMember(userId: number, userActionDo: UserActionDto) {
    await this.verifyMember(userId, userActionDo.roomId);
    const other = await this.repository.findMember(
      userActionDo.memberId,
      userActionDo.roomId,
    );
    if (other.role === Role.ADMIN || other.role === Role.OWNER) {
      throw new UnauthorizedException('Action not authorized');
    }
    return await this.repository.kickChatRoomMember(other.id);
  }
  async banChatRoomMember(userId: number, userActionDo: UserActionDto) {
    await this.verifyMember(userId, userActionDo.roomId);
    const other = await this.repository.findMember(
      userActionDo.memberId,
      userActionDo.roomId,
    );
    if (other.role === Role.ADMIN || other.role === Role.OWNER) {
      throw new UnauthorizedException('Action not authorized');
    }
    return await this.repository.banChatRoomMember(other.id);
  }
  async muteChatRoomMember(userId: number, userActionDo: UserActionDto) {
    await this.verifyMember(userId, userActionDo.roomId);
    const other = await this.repository.findMember(
      userActionDo.memberId,
      userActionDo.roomId,
    );
    if (other.role === Role.ADMIN || other.role === Role.OWNER) {
      throw new UnauthorizedException('Action not authorized');
    }
    return await this.repository.muteChatRoomMember(other.id);
  }
}
