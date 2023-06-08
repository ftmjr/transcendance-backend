import { Injectable } from '@nestjs/common';
import { Prisma, Session, User } from '@prisma/client';
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

  async deleteUser(params: {
    where: Prisma.UserWhereUniqueInput;
  }): Promise<User> {
    const { where } = params;
    return this.prisma.user.delete({ where });
  }

  async getUser(params: {
    where: Prisma.UserWhereUniqueInput;
  }): Promise<User | null> {
    const { where } = params;
    return this.prisma.user.findUnique({ where });
  }

  async getByID(params: { id: User[`id`] }): Promise<User | null> {
    const { id } = params;
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getByEmail(params: { email: User[`email`] }): Promise<User | null> {
    const { email } = params;
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
}
