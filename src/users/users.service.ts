import { Injectable } from '@nestjs/common';
import { User, Session } from '@prisma/client';
import { UsersRepository } from './users.repository';
import * as argon from 'argon2';

function exclude<User, Key extends keyof User>(
  user: User,
  keys: Key[],
): Omit<User, Key> {
  for (const key of keys) {
    delete user[key];
  }
  return user;
}

@Injectable()
export class UsersService {
  constructor(private repository: UsersRepository) {}

  async createUser(params: {
    username: User[`username`];
    email: User[`email`];
    password: User[`password`];
  }) {
    const { email, password, username } = params;
    // hash password
    const hashedPassword = await argon.hash(password);
    // call repository layer
    return this.repository.createUser({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });
  }

  createSession(params: {
    user: User;
    token: Session[`token`];
    ipAddress?: Session[`ipAddress`];
    userAgent?: Session[`userAgent`];
    expiresAt: Session[`expiresAt`];
  }) {
    const { user, token, ipAddress, userAgent, expiresAt } = params;
    const session = this.repository.createSession({
      data: {
        token,
        ipAddress,
        userAgent,
        expiresAt,
        user: { connect: { id: user.id } },
      },
    });
    return session;
  }

  async getUser(params: { id: User[`id`] }) {
    const { id } = params;
    const user = await this.repository.getUser({ where: { id } });
    return user;
  }

  async getUserByEmail(email: User[`email`]) {
    const user = await this.repository.getByEmail({ email });
    return user;
  }

  async getUserByUsername(username: User[`username`]) {
    const user = await this.repository.getUser({ where: { username } });
    return user;
  }

  // take 1 because we only want one user
  async getUserBySessionId(sessionId: Session[`id`]) {
    return this.repository.getUsers({
      where: { sessions: { some: { id: sessionId } } },
      take: 1,
    });
  }

  async getUsers() {
    const users = await this.repository.getUsers({});
    const usersWithoutPassword = users.map((user) =>
      exclude(user, ['password']),
    );
    return usersWithoutPassword;
  }

  async getUsersWithProfiles() {
    const users = await this.repository.getUsers({
      include: { profile: true },
    });
    const usersWithoutPassword = users.map((user) =>
      exclude(user, ['password']),
    );
    return usersWithoutPassword;
  }

  async getPagingUsers(params: {
    skip?: number;
    take?: number;
    cursor?: User[`id`];
  }) {
    const { skip, take, cursor } = params;
    const users = await this.repository.getUsers({
      skip,
      take,
      cursor: cursor ? { id: cursor } : undefined,
      include: { profile: true, gameHistories: true },
    });
    const usersWithoutPassword = users.map((user) =>
      exclude(user, ['password']),
    );
    return usersWithoutPassword;
  }

  // session management

  async getSession(params: { id: Session[`id`] }) {
    const { id } = params;
    const session = await this.repository.getSessions({ where: { id } });
    return session;
  }

  async getSessionById(id: Session[`id`]) {
    return this.repository.getSession({ where: { id } });
  }
  async updateSession(
    sessionId: Session[`id`],
    refreshToken: Session[`token`],
    expiresAt: Session[`expiresAt`],
  ) {
    const session = await this.repository.updateSession({
      where: { id: sessionId },
      data: { token: refreshToken, expiresAt },
    });
    return session;
  }

  async deleteSession(params: { id: Session[`id`] }) {
    const { id } = params;
    return this.repository.deleteSession({ where: { id } });
  }

  // get all sessions for a user
  getAllUserSessions(params: { userId: User[`id`] }) {
    const { userId } = params;
    const sessions = this.repository.getSessions({
      where: { userId },
    });
    return sessions;
  }
}
