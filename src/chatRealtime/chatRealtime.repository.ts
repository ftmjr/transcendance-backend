import { Injectable } from '@nestjs/common';
import { Prisma, ChatRoom, ChatRoomMember, User, Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoomDto } from './dto/createRoom.dto';

@Injectable()
export class ChatRealtimeRepository {
  constructor(private prisma: PrismaService) {}

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

    const ownerMember: ChatRoomMember = await this.prisma.chatRoomMember.create(
      {
        data: {
          memberId: ownerId,
          chatroomId: createdRoom.id,
          role: Role.OWNER,
        },
      },
    );
    if (!ownerMember) {
      // delete room & throw error
    }
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
    await this.prisma.chatRoomMember.delete({
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
    await this.deleteMember(chatRoomMember.id);
    if (chatRoomMember.role != Role.OWNER) {
      return;
    }
    const newOwner = await this.findNewOwner(roomId);
    if (!newOwner) {
      await this.deleteRoom(roomId);
    } else {
      await this.updateOwner(newOwner.id);
    }
  }
}
