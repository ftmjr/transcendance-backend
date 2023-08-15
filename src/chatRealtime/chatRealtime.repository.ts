import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ChatRoom,
  ChatRoomMessage,
  User,
  Role,
  Status,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoomDto } from './dto/createRoom.dto';
import { JoinRoomDto } from './dto/joinRoom.dto';
import { UserActionDto } from "./dto/userAction.dto";
import { UsersService } from "../users/users.service";
import {Server, Socket} from 'socket.io';
import {WebSocketServer} from "@nestjs/websockets";
import {ClientToServerEvents, ServerToClientEvents} from "./interfaces/chat.interface";


@Injectable()
export class ChatRealtimeRepository {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async getRooms(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ChatRoomWhereUniqueInput;
    where?: Prisma.ChatRoomWhereInput;
    orderBy?: Prisma.ChatRoomOrderByWithRelationInput;
    include?: Prisma.ChatRoomInclude;
  }): Promise<ChatRoom[]> {
    const { skip, take, cursor, where, orderBy, include } = params;
    return this.prisma.chatRoom.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include,
    });
  }
  async createRoom(
    params: { data: Prisma.ChatRoomCreateInput },
    ownerId: number,
  ): Promise<ChatRoom> {
    const { data } = params;
    const createdRoom = await this.prisma.chatRoom.create({ data });

    await this.prisma.chatRoomMember.create({
      data: {
        memberId: ownerId,
        chatroomId: createdRoom.id,
        role: Role.OWNER,
      },
    });
    return createdRoom;
  }
  getChatRoomMember(userId: number, roomId: number) {
    return this.prisma.chatRoomMember.findFirst({
      where: {
        memberId: userId,
        chatroomId: roomId,
      },
    });
  }

  async findNewOwner(roomId: number) {
    const admin = await this.prisma.chatRoomMember.findFirst({
      where: {
        chatroomId: roomId,
        role: Role.ADMIN,
      },
    });
    if (!admin) {
      return await this.prisma.chatRoomMember.findFirst({
        where: {
          chatroomId: roomId,
          role: { not: Role.BAN },
        },
      });
    } else {
      return admin;
    }
  }

  async updateOwner(memberId: number) {
    await this.prisma.chatRoomMember.update({
      data: {
        role: Role.OWNER,
      },
      where: {
        id: memberId,
      },
    });
  }

  async deleteMember(memberId: number) {
    return await this.prisma.chatRoomMember.delete({
      where: {
        id: memberId,
      },
    });
  }

  async deleteRoom(roomId: number) {
    await this.prisma.chatRoom.delete({
      where: {
        id: roomId,
      },
    });
  }
  async leaveRoom(user: User, roomId: number) {
    const chatRoomMember = await this.getChatRoomMember(user.id, roomId);
    if (!chatRoomMember) {
      throw new NotFoundException('ChatRoom Member not found');
    }
    const oldMember = await this.deleteMember(chatRoomMember.id);
    if (!oldMember || oldMember.role != Role.OWNER) {
      return chatRoomMember;
    }
    const newOwner = await this.findNewOwner(roomId);
    if (!newOwner) {
      await this.deleteRoom(roomId);
    } else {
      await this.updateOwner(newOwner.id);
    }
    return chatRoomMember;
  }
  async getRoom(roomName: string) {
    return await this.prisma.chatRoom.findUnique({
      where: {
        name: roomName,
      },
    });
  }
  async joinRoom(data: JoinRoomDto) {
    const room = await this.getRoom(data.roomName);
    if (!room) {
      throw new NotFoundException('already exists');
    } else if (room.password !== data.password) {
      throw new ForbiddenException('Invalid Password');
    }

    const newMember = await this.prisma.chatRoomMember.create({
      data: {
        memberId: data.userId,
        chatroomId: room.id,
        role: Role.USER,
      },
    });
    return newMember;
  }
  async findBanFrom(userId: number) {
    return await this.prisma.chatRoomMember.findMany({
      where: {
        memberId: userId,
        role: Role.BAN,
      },
    });
  }
  async findMember(userId: number, roomId: number) {
    return await this.prisma.chatRoomMember.findFirst({
      where: {
        memberId: userId,
        chatroomId: roomId,
      },
    });
  }
  async getRoomMembers(roomId: number) {
    return await this.prisma.chatRoomMember.findMany({
      where: {
        chatroomId: roomId,
      },
      orderBy: {
        member: {
          username: 'asc',
          profile: {
            status: 'desc',
          },
        },
      },
    });
  }
  async getRoomMessages(roomId: number) {
    return await this.prisma.chatRoomMessage.findMany({
      where: {
        chatroomId: roomId,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });
  }
  async kickChatRoomMember(chatRoomMemberId: number) {
    return await this.prisma.chatRoomMember.delete({
      where: {
        id: chatRoomMemberId,
      },
    });
  }
  async banChatRoomMember(chatRoomMemberId: number) {
    return await this.prisma.chatRoomMember.updateOne({
      where: {
        id: chatRoomMemberId,
      },
      data: {
        role: Role.BAN,
      },
    });
  }
  async muteChatRoomMember(chatRoomMemberId: number) {
    return await this.prisma.chatRoomMember.updateOne({
      where: {
        id: chatRoomMemberId,
      },
      data: {
        role: Role.MUTED,
      },
    });
  }
  async createMessage(params): Promise<ChatRoomMessage> {
    const { data } = params;
    return await this.prisma.chatRoomMessage.create({ data });
  }
}
