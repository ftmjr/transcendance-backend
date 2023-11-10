import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ChatRepository, ChatRoomWithMembers } from './chat.repository';
import * as argon from 'argon2';
import { getRandomAvatarUrl, UsersService } from '../users/users.service';
import { Role, RoomType, Status } from '@prisma/client';
import { CreateRoomDto, JoinRoomDto, UpdatePasswordDto } from './dto';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class ChatService {
  constructor(
    private repository: ChatRepository,
    private usersService: UsersService,
    private notificationService: NotificationService,
  ) {}

  async createRoom(info: CreateRoomDto) {
    if (info.type === RoomType.PROTECTED && !info.password) {
      throw new Error('Password is required, for protected room');
    }
    if (info.password) {
      info.password = await argon.hash(info.password); // hash password before save to database
    }
    const data = {
      name: info.name,
      type: info.type,
      avatar: info.avatar ?? getRandomAvatarUrl(),
      password: info.password,
    };
    const ownerId = info.ownerId;
    return this.repository.createRoom({ data }, ownerId);
  }
  async addUserToARoom(
    info: { roomId: number; userId: number; password?: string },
    actorId: number,
  ) {
    const room = await this.getRoom({ roomId: info.roomId });
    if (!room) {
      throw new NotFoundException(`Salle de chat introuvable`);
    }
    if (room.type === RoomType.PRIVATE) {
      // only admin and owner can add member to private room
      this.checkIfCanActInTheRoom(actorId, room, [Role.OWNER, Role.ADMIN]);
    } else if (room.type === RoomType.PROTECTED) {
      // anyone can join a protected room, if they have the password
      if (!info.password) {
        throw new UnauthorizedException(
          `Vous devez fournir un mot de passe pour rejoindre cette salle de chat`,
        );
      }
      if (!(await argon.verify(room.password, info.password))) {
        throw new ForbiddenException(`Mot de passe incorrect`);
      }
    }
    try {
      const newMember = await this.repository.joinRoom(
        info.userId,
        info.roomId,
        Role.USER,
      );
      this.notificationService.createChatJoinNotification(
        newMember.memberId,
        room.id,
        `Vous avez été ajouté à la salle de chat ${room.name}`,
      );
      return newMember;
    } catch (e) {
      throw new Error('Failed to add, User probably already in the room');
    }
  }

  // return true or throw error
  async canListenToRoom(roomId: number, userId: number) {
    const room = await this.getRoom({ roomId });
    if (room.type === RoomType.PRIVATE || room.type === RoomType.PROTECTED) {
      this.checkIfCanActInTheRoom(userId, room, [
        Role.OWNER,
        Role.ADMIN,
        Role.USER,
        Role.MUTED,
        Role.BAN,
      ]);
    }
    return true;
  }

  async getPublicRooms(): Promise<ChatRoomWithMembers[]> {
    return this.repository.getPublicRooms();
  }
  async sendMessageToRoom(roomId: number, content: string, senderId: number) {
    const room = await this.getRoom({ roomId });
    this.checkIfCanActInTheRoom(senderId, room, [
      Role.OWNER,
      Role.ADMIN,
      Role.USER,
      Role.SUPER_MODERATOR,
    ]);
    return this.repository.createRoomMessage({
      data: {
        content,
        user: { connect: { id: senderId } },
        chatroom: { connect: { id: roomId } },
      },
    });
  }

  async setUserAsAdmin(roomId: number, userId: number, actorId: number) {
    const room = await this.getRoom({ roomId });
    const owner = this.checkIfCanActInTheRoom(actorId, room, [Role.OWNER]);
    if (owner.memberId === userId) {
      throw new UnauthorizedException('You cannot promote yourself');
    }
    const member = this.checkIfCanActInTheRoom(actorId, room, [
      Role.MUTED,
      Role.BAN,
      Role.USER,
      Role.ADMIN,
    ]);
    return this.repository.updateChatRoomMember({
      where: { id: member.id },
      data: { role: Role.ADMIN },
    });
  }

  // actorId is the user who is trying to act
  async setUserAsMuted(roomId: number, userId: number, actorId: number) {
    try {
      const room = await this.getRoom({ roomId });
      this.checkIfCanActInTheRoom(actorId, room, [Role.OWNER, Role.ADMIN]);
      const member = this.checkIfCanActInTheRoom(userId, room, [
        Role.MUTED,
        Role.BAN,
        Role.USER,
      ]);
      return this.repository.updateChatRoomMember({
        where: { id: member.id },
        data: { role: Role.MUTED },
      });
    } catch (e) {
      throw new UnauthorizedException('Failed to mute user');
    }
  }

  async setUserAsBanned(roomId: number, userId: number, actorId: number) {
    try {
      const room = await this.getRoom({ roomId });
      this.checkIfCanActInTheRoom(actorId, room, [Role.OWNER, Role.ADMIN]);
      const member = this.checkIfCanActInTheRoom(userId, room, [
        Role.MUTED,
        Role.BAN,
        Role.USER,
      ]);
      return this.repository.updateChatRoomMember({
        where: { id: member.id },
        data: { role: Role.BAN },
      });
    } catch (e) {
      throw new UnauthorizedException('Failed to ban user');
    }
  }

  async setUserAsUser(roomId: number, userId: number, actorId: number) {
    try {
      const room = await this.getRoom({ roomId });
      this.checkIfCanActInTheRoom(actorId, room, [Role.OWNER, Role.ADMIN]);
      const member = this.checkIfCanActInTheRoom(userId, room, [
        Role.MUTED,
        Role.BAN,
        Role.USER,
        Role.ADMIN,
      ]);
      return this.repository.updateChatRoomMember({
        where: { id: member.id },
        data: { role: Role.USER },
      });
    } catch (e) {
      throw new Error('Failed to set user as user');
    }
  }

  async removeUserFromRoom(roomId: number, userId: number, actorId: number) {
    const room = await this.getRoom({ roomId });
    const owner = this.checkIfCanActInTheRoom(actorId, room, [
      Role.OWNER,
      Role.ADMIN,
    ]);
    if (owner.memberId === userId) {
      throw new Error('You cannot remove yourself');
    }
    const member = this.checkIfCanActInTheRoom(actorId, room, [
      Role.MUTED,
      Role.BAN,
      Role.USER,
      Role.ADMIN,
    ]);
    return this.repository.deleteMemberFromRoom(member.id);
  }

  async removeMyselfFromRoom(roomId: number, userId: number) {
    const room = await this.getRoom({ roomId });
    const member = this.checkIfCanActInTheRoom(userId, room, [
      Role.MUTED,
      Role.BAN,
      Role.USER,
      Role.ADMIN,
      Role.OWNER,
    ]);
    if (member.role === Role.OWNER) {
      const newOwner = await this.repository.findPotentialNewOwner(roomId);
      // if no other member is found, delete the room
      if (!newOwner) {
        this.notificationService.createChatJoinNotification(
          userId,
          room.id,
          `La salle de chat ${room.name} a été supprimée`,
        );
        await this.repository.deleteRoom(roomId);
        return;
      }
      await this.repository.updateChatRoomMember({
        where: { id: newOwner.id },
        data: { role: Role.OWNER },
      });
      this.notificationService.createChatJoinNotification(
        newOwner.memberId,
        room.id,
        `Vous avez été promu propriétaire de la salle de chat ${room.name}`,
      );
    }
    return this.repository.deleteMemberFromRoom(member.id);
  }

  async deleteRoom(roomId: number, userId: number) {
    const room = await this.getRoom({ roomId });
    this.checkIfCanActInTheRoom(userId, room, [Role.OWNER]);
    this.notificationService.createChatJoinNotification(
      userId,
      room.id,
      `La salle de chat ${room.name} a été supprimée`,
    );
    return this.repository.deleteRoom(roomId);
  }

  async getRoomMessages(
    roomId: number,
    userId: number,
    info: { skip?: number; take?: number },
  ) {
    const room = await this.getRoom({ roomId });
    this.checkIfCanActInTheRoom(userId, room, [
      Role.OWNER,
      Role.ADMIN,
      Role.USER,
      Role.MUTED,
    ]);
    return this.repository.getRoomMessages(roomId, {
      skip: info.skip,
      take: info.take,
    });
  }

  async getRoomMembers(roomId: number, userId: number) {
    const room = await this.getRoom({ roomId });
    if (room.type === RoomType.PRIVATE || room.type === RoomType.PROTECTED) {
      this.checkIfCanActInTheRoom(userId, room, [
        Role.OWNER,
        Role.ADMIN,
        Role.USER,
        Role.MUTED,
        Role.BAN,
      ]);
    }
    return this.repository.getChatRoomMembers(roomId);
  }

  async getRoomMember(roomId: number, userId: number, memberId: number) {
    const room = await this.getRoom({ roomId });
    if (room.type === RoomType.PRIVATE || room.type === RoomType.PROTECTED) {
      this.checkIfCanActInTheRoom(userId, room, [
        Role.OWNER,
        Role.ADMIN,
        Role.USER,
        Role.MUTED,
        Role.BAN,
      ]);
    }
    return this.repository.getChatRoomMember(memberId, roomId);
  }

  async getUserRooms(userId: number) {
    return this.repository.getMemberRooms(userId);
  }

  async changeUserStatus(userId: number, status: Status) {
    return this.usersService.changeStatus(userId, status);
  }

  async changeChatAvatar(roomId: number, userId: number, url: string) {
    const room = await this.getRoom({ roomId });
    this.checkIfCanActInTheRoom(userId, room, [Role.OWNER, Role.ADMIN]);
    return this.repository.updateRoom({
      where: { id: roomId },
      data: { avatar: url },
    });
  }

  async updateRoomPassword(data: UpdatePasswordDto, userId: number) {
    const { roomId, password } = data;
    const room = await this.getRoom({ roomId });
    this.checkIfCanActInTheRoom(userId, room, [Role.OWNER, Role.ADMIN]);
    const hashedPassword = await argon.hash(password);
    return this.repository.updateRoom({
      where: { id: roomId },
      data: { password: hashedPassword },
    });
  }

  /* utility functions */

  /*
   * Try to find a room by id or name
   */
  async getRoom(info: {
    roomId?: number;
    name?: string;
  }): Promise<ChatRoomWithMembers> {
    try {
      return await this.repository.getRoom({
        where: {
          id: info.roomId,
          name: info.name,
        },
      });
    } catch (e) {
      throw new NotFoundException('Room not found');
    }
  }

  /*
   * Check if the user can act in the room, if not throw error
   * return the member object
   * @param actorId the user who is trying to act
   * @param chatRoom the room where the user is trying to act
   * @param grantedRoles the roles that are allowed to act
   */
  checkIfCanActInTheRoom(
    actorId: number,
    chatRoom: ChatRoomWithMembers,
    grantedRoles: Role[],
  ) {
    const member = chatRoom.members.find((m) => m.memberId === actorId);
    if (!member) {
      throw new UnauthorizedException(`Vous n'êtes pas membre de cette salle`);
    }
    if (!grantedRoles.includes(member.role)) {
      throw new ForbiddenException(`Vous n'avez pas la permission, ou le rôle`);
    }
    return member;
  }
}
