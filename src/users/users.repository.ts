import { Injectable } from '@nestjs/common';
import {
  Prisma,
  BlockedUser,
  Session,
  User,
  Profile,
  ContactRequest,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private prisma: PrismaService) {}

  async createUser(params: { data: Prisma.UserCreateInput }): Promise<User> {
    const { data } = params;
    return this.prisma.user.create({ data });
  }
  async getUsers(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
    include?: Prisma.UserInclude;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy, include } = params;
    return this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include,
    });
  }

  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    const { where, data } = params;
    return this.prisma.user.update({ where, data });
  }
  async updateProfile(params: {
    where: Prisma.ProfileWhereUniqueInput;
    data: Prisma.ProfileUpdateInput;
  }): Promise<Profile> {
    const { where, data } = params;
    return this.prisma.profile.update({ where, data });
  }

  async deleteUser(params: {
    where: Prisma.UserWhereUniqueInput;
    include?: Prisma.UserInclude;
  }): Promise<User> {
    const { where, include } = params;
    return this.prisma.user.delete({ where, include });
  }

  async getUser(params: {
    where: Prisma.UserWhereUniqueInput;
    include?: Prisma.UserInclude;
  }): Promise<User | null> {
    const { where, include } = params;
    return this.prisma.user.findUnique({ where, include });
  }

  async getByID(id: User[`id`]): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getByUserName(username: User[`username`]): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async getByEmail(email: User[`email`]): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  // session
  async createSession(params: {
    data: Prisma.SessionCreateInput;
  }): Promise<Session> {
    const { data } = params;
    return this.prisma.session.create({ data });
  }

  async getSessions(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.SessionWhereUniqueInput;
    where?: Prisma.SessionWhereInput;
    orderBy?: Prisma.SessionOrderByWithRelationInput;
  }): Promise<Session[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.session.findMany({ skip, take, cursor, where, orderBy });
  }

  async updateSession(params: {
    where: Prisma.SessionWhereUniqueInput;
    data: Prisma.SessionUpdateInput;
  }): Promise<Session> {
    const { where, data } = params;
    return this.prisma.session.update({ where, data });
  }

  async deleteSession(params: {
    where: Prisma.SessionWhereUniqueInput;
  }): Promise<Session> {
    const { where } = params;
    return this.prisma.session.delete({ where });
  }

  async getSession(params: {
    where: Prisma.SessionWhereUniqueInput;
  }): Promise<Session | null> {
    const { where } = params;
    return this.prisma.session.findUnique({ where });
  }
  async getUserBlocked(userId: number) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        blockedUsers: true,
        blockedFrom: true,
      },
    });
  }
  async getBlockUser(userId: number, blockedUserId: number) {
    return await this.prisma.blockedUser.findFirst({
      where: {
        userId: userId,
        blockedUserId: blockedUserId,
      },
    });
  }
  async blockUser(userId: number, blockedUserId: number) {
    return this.prisma.blockedUser.create({
      data: {
        userId: userId,
        blockedUserId: blockedUserId,
      },
    });
  }
  async unblockUser(userId: number, blockedUserId: number) {
    const relation = await this.getBlockUser(userId, blockedUserId);
    if (relation) {
      return await this.prisma.blockedUser.delete({
        where: {
          id: relation.id,
        },
      });
    }
  }
  async getBlockedUsers(userId: number) {
    return await this.prisma.blockedUser.findMany({
      where: {
        userId: userId,
      },
      include: {
        blockedUser: {
          include: {
            profile: true,
          },
        },
      },
    });
  }
}
