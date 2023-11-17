import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ChatRepository, ChatRoomWithMembers } from './chat.repository';
import * as argon from 'argon2';
import { getRandomAvatarUrl, UsersService } from '../users/users.service';
import { ChatRoom, ChatRoomMember, Role, RoomType } from '@prisma/client';
import { CreateRoomDto, UpdatePasswordDto, UpdateRoleDto } from './dto';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class ChatService {
  private toBeUnMuted: { userId: number; roomId: number; time: number }[] = [];

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
  async addUserToARoom(info: {
    roomId: number;
    userId: number;
    password?: string;
  }) {
    const room = await this.getRoom({ roomId: info.roomId });
    if (!room) {
      throw new NotFoundException(`Salle de chat introuvable`);
    }

    // // private room can only be joined by invited user
    // if (room.type === RoomType.PRIVATE) {
    //   // only admin and owner can add member to private room
    //   this.checkIfCanActInTheRoom(actorId, room, [Role.OWNER, Role.ADMIN]);
    // }

    // need to provide the password if a room as a password
    if (room.password && !info.password) {
      throw new ForbiddenException(`Mot de passe requis`);
    } else if (room.password && info.password) {
      if (!(await argon.verify(room.password, info.password))) {
        throw new ForbiddenException(`Mot de passe incorrect`);
      }
    }
    // check if user is already a member
    room.members.forEach((member) => {
      if (member.memberId === info.userId) {
        throw new UnauthorizedException(`Vous êtes déjà membre de cette salle`);
      }
    });
    return this.addMemberToRoom(info.roomId, info.userId, Role.USER, room.name);
  }

  async addMemberToRoom(
    roomId: number,
    userId: number,
    role: Role,
    roomName: string,
  ): Promise<ChatRoomMember> {
    try {
      const newMember = await this.repository.joinRoom(userId, roomId, role);
      this.notificationService.createChatJoinNotification(
        userId,
        roomId,
        `Vous avez été ajouté à la salle de chat ${roomName}`,
      );
      return newMember;
    } catch (e) {
      throw new UnauthorizedException(
        'Impossible de rejoindre la salle de chat, pour cet utilisateur',
      );
    }
  }

  // return true or throw error
  async canListenToRoom(roomId: number, userId: number) {
    try {
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
    } catch (e) {
      return false;
    }
  }

  // Return PUBLIC and PROTECTED rooms
  async getPublicRooms(): Promise<ChatRoomWithMembers[]> {
    return this.repository.getPublicRooms();
  }
  async sendMessageToRoom(roomId: number, content: string, senderId: number) {
    const room = await this.getRoom({ roomId });
    this.checkIfCanActInTheRoom(senderId, room, [
      Role.OWNER,
      Role.ADMIN,
      Role.USER,
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
  async setUserAsMuted(
    roomId: number,
    userId: number,
    actorId: number,
  ): Promise<ChatRoomMember> {
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

  async setUserAsMutedWithTime(
    roomId: number,
    userId: number,
    actorId: number,
    timestamp: number, // expiration time
  ): Promise<ChatRoomMember> {
    try {
      const mutedMember = await this.setUserAsMuted(roomId, userId, actorId);
      this.toBeUnMuted.push({ userId, roomId, time: timestamp });
      return mutedMember;
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

  // Failed if user is not a member, if not owner/admin acting, or owner try to set himself as user
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

  async changeMemberRole(roomId: number, info: UpdateRoleDto, actorId: number) {
    switch (info.role) {
      case Role.USER:
        return this.setUserAsUser(roomId, info.userId, actorId);
      case Role.ADMIN:
        return this.setUserAsAdmin(roomId, info.userId, actorId);
      case Role.MUTED:
        if (info.expireAt) {
          return this.setUserAsMutedWithTime(
            roomId,
            info.userId,
            actorId,
            info.expireAt,
          );
        }
        return this.setUserAsMuted(roomId, info.userId, actorId);
      case Role.BAN:
        return this.setUserAsBanned(roomId, info.userId, actorId);
      default:
        throw new UnauthorizedException('Invalid role');
    }
  }

  async removeUserFromRoom(roomId: number, userId: number, actorId: number) {
    const room = await this.getRoom({ roomId });
    const owner = this.checkIfCanActInTheRoom(actorId, room, [
      Role.OWNER,
      Role.ADMIN,
    ]);
    if (owner.memberId === userId) {
      throw new ForbiddenException('You cannot remove yourself');
    }
    const member = this.checkIfCanActInTheRoom(userId, room, [
      Role.MUTED,
      Role.BAN,
      Role.USER,
      Role.ADMIN,
    ]);
    this.notificationService.createChatRoomRemovedNotification(
      member.memberId,
      room.id,
      `Vous avez été supprimé de la salle de chat ${room.name}`,
    );
    return this.repository.deleteMemberFromRoom(member.id);
  }

  async removeMyselfFromRoom(roomId: number, userId: number) {
    const room = await this.getRoom({ roomId });
    const member = this.checkIfCanActInTheRoom(userId, room, [
      Role.ADMIN,
      Role.OWNER,
      Role.USER,
      Role.MUTED,
      Role.BAN,
    ]);
    if (member.role === Role.OWNER) {
      const newOwner = await this.repository.findPotentialNewOwner(roomId);
      // if no other member is found, delete the room
      if (!newOwner) {
        this.notificationService.createChatRoomDestroyedNotification(
          room.members.map((m) => m.memberId),
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
      this.notificationService.createChatRoomPromotionNotification(
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

  // Return all messages of a room, only if the user is a member, Banned can't see messages
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

  //  Return all members of a room (including banned and muted), for private only if the user is a member
  async getRoomMembers(roomId: number, userId: number) {
    const room = await this.getRoom({ roomId });
    if (room.type === RoomType.PRIVATE) {
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

  async checkUserMembership(
    roomId: number,
    userId: number,
  ): Promise<{ state: boolean; role: Role | null; room?: ChatRoom }> {
    const room = await this.repository.getSimpleRoom({ where: { id: roomId } });
    const member = await this.repository.getChatRoomMember(userId, roomId);
    if (member) {
      return { state: true, role: member.role, room };
    } else {
      return { state: false, role: null, room };
    }
  }

  async getUserRooms(userId: number) {
    return this.repository.getMemberRooms(userId);
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

  // unMute all users that are muted and the time is up
  async unMuteAllWaitingMutedUsers() {
    const now = Date.now();
    this.toBeUnMuted = this.toBeUnMuted.filter((mutedUser) => {
      if (mutedUser.time <= now) {
        this.repository.updateChatRoomMember({
          where: { id: mutedUser.userId },
          data: { role: Role.USER },
        });
        return false;
      }
      return true;
    });
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
