import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ChatRoom,
  ChatRoomMessage,
  GeneralMessage,
  User,
  Role,
  Status,
  PrivateMessage,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { JoinRoomDto } from './dto/joinRoom.dto';
import { UsersService } from '../users/users.service';

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
  async getChatRoomMember(userId: number, roomId: number) {
    const member = await this.prisma.chatRoomMember.findFirst({
      where: {
        memberId: userId,
        chatroomId: roomId,
      },
    });
    if (!member) {
      return await this.prisma.chatRoomMember.create({
        data: {
          memberId: userId,
          chatroomId: roomId,
        },
      });
    }
    return member;
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
  async joinRoom(data: JoinRoomDto, roomId: number) {
    return await this.prisma.chatRoomMember.create({
      data: {
        memberId: data.userId,
        chatroomId: roomId,
        role: Role.USER,
      },
    });
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
        },
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
      },
    });
  }
  async getMemberRooms(userId: number) {
    return await this.prisma.chatRoom.findMany({
      where: {
        members: {
          some: {
            memberId: userId,
          },
        },
      },
    });
  }
  async getRoomMessages(roomId: number, { skip, take }) {
    return await this.prisma.chatRoomMessage.findMany({
      where: {
        chatroomId: roomId,
      },
      orderBy: {
        timestamp: 'asc',
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
      skip: skip,
      take: take,
    });
  }
  async getGeneralMessages({ skip, take }) {
    return await this.prisma.generalMessage.findMany({
      orderBy: {
        timestamp: 'asc',
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
      skip: skip,
      take: take,
    });
  }
  async getGeneralMembers({ skip, take }) {
    return await this.prisma.generalMember.findMany({
      orderBy: {
        createdAt: 'asc',
      },
      skip: skip,
      take: take,
      include: {
        member: {
          include: {
            profile: true,
          },
        },
      },
    });
  }
  async getGeneralMember(userId: number) {
    return await this.prisma.generalMember.findFirst({
      where: {
        memberId: userId,
      },
    });
  }
  async createGeneralMember(userId: number) {
    return await this.prisma.generalMember.create({
      data: {
        memberId: userId,
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
    return await this.prisma.chatRoomMember.update({
      where: {
        id: chatRoomMemberId,
      },
      data: {
        role: Role.BAN,
      },
    });
  }
  async muteChatRoomMember(chatRoomMemberId: number) {
    return await this.prisma.chatRoomMember.update({
      where: {
        id: chatRoomMemberId,
      },
      data: {
        role: Role.MUTED,
      },
    });
  }
  async createRoomMessage(params): Promise<ChatRoomMessage> {
    const { data } = params;
    return await this.prisma.chatRoomMessage.create({
      data,
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });
  }
  async createGeneralMessage(params): Promise<GeneralMessage> {
    const { data } = params;
    return await this.prisma.generalMessage.create({
      data,
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });
  }
  async updateChatRoomMember(params) {
    const { data, where } = params;
    return await this.prisma.chatRoomMember.update({ data, where });
  }
  async createPrivateMessage(params): Promise<PrivateMessage> {
    const { data } = params;
    return await this.prisma.privateMessage.create({
      data,
      include: {
        sender: {
          include: {
            profile: true,
          },
        },
      },
    });
  }

  async getPrivateMessages(
    { skip, take },
    dmSenderId: number,
    dmReceiverId: number,
  ) {
    return await this.prisma.privateMessage.findMany({
      where: {
        OR: [
          {
            senderId: dmSenderId,
            receiverId: dmReceiverId,
          },
          {
            senderId: dmReceiverId,
            receiverId: dmSenderId,
          },
        ],
      },
      include: {
        sender: {
          include: {
            profile: true,
          },
        },
        receiver: {
          include: {
            profile: true,
          },
        },
      },
      skip: skip,
      take: take,
    });
  }
  async getConversations(userId: number) {
    const privateMessages = await this.prisma.privateMessage.findMany({
      where: {
        OR: [
          {
            senderId: userId,
          },
          {
            receiverId: userId,
          },
        ],
      },
      select: {
        senderId: true,
        receiverId: true,
      },
    });
    const distinctUserIds = [
      ...new Set([
        ...privateMessages.map((message) => message.senderId),
        ...privateMessages.map((message) => message.receiverId),
      ]),
    ];
    return this.prisma.user.findMany({
      where: {
        id: {
          in: distinctUserIds,
        },
      },
      include: {
        profile: true,
      },
    });
  }
}
