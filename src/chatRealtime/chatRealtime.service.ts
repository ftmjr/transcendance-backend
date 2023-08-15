import {Injectable, UnauthorizedException} from '@nestjs/common';
import { ChatRealtimeRepository } from './chatRealtime.repository';
import { CreateRoomDto } from './dto/createRoom.dto';
import {Status, Prisma, User, Role} from '@prisma/client';
import {ClientToServerEvents, NewRoom, ServerToClientEvents} from './interfaces/chat.interface';
import { JoinRoomDto } from './dto/joinRoom.dto';
import { ChatRealtimeGateway } from './chatRealtime.gateway';
import {UserActionDto} from "./dto/userAction.dto";
import {WebSocketServer} from "@nestjs/websockets";
import {Server} from "socket.io";

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
  @WebSocketServer() server: Server = new Server<
    ServerToClientEvents,
    ClientToServerEvents
  >();
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
    return await this.repository.getRoomMessages(roomId);
  }

  async createRoom(newRoom: CreateRoomDto) {
    const data: Prisma.ChatRoomCreateInput = {
      name: newRoom.name,
      private: newRoom.private,
      protected: newRoom.protected,
      password: '',
    };
    if (newRoom.protected) {
      data.password = newRoom.password;
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
  async joinRoom(data: JoinRoomDto) {
    return await this.repository.joinRoom(data);
  }
  async kickChatRoomMember(userId: number, userActionDo: UserActionDto) {
    const user = await this.verifyMember(userId, userActionDo.roomId);
    if (!user) {
      throw new UnauthorizedException('User not allowed');
    }
    const other = await this.repository.findMember(
      userActionDo.memberId,
      userActionDo.roomId,
    );
    if (other.role === Role.ADMIN || other.role === Role.OWNER) {
      throw new UnauthorizedException('Action not authorized');
    }
    return await this.repository.kickChatRoomMember(other.id);
  }
  emitTo(event, roomName, object) {
    this.server.to(roomName).emit('chat', object); // broadcast messages
  }
  emitOn(event) {
    this.server.emit(event);
  }
  socketJoin(id, roomName) {
    this.server.in(id).socketsJoin(roomName);
  }
  socketLeave(id, roomName) {
    this.server.in(id).socketsLeave(roomName);
  }
}
