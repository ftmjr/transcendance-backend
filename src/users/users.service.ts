import { Injectable } from '@nestjs/common';
import { Profile, Session, User, Prisma } from '@prisma/client';
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

function getRandomSpiderManAvatarUrl(): string {
  const list = [
    'https://cdn-icons-png.flaticon.com/512/1090/1090806.png',
    'https://cdn-icons-png.flaticon.com/512/1610/1610778.png',
    'https://cdn-icons-png.flaticon.com/512/1610/1610747.png',
    'https://cdn-icons-png.flaticon.com/512/1610/1610716.png',
    'https://cdn-icons-png.flaticon.com/512/1674/1674456.png',
    'https://cdn-icons-png.flaticon.com/512/1674/1674213.png',
    'https://cdn-icons-png.flaticon.com/512/10941/10941706.png',
  ];
  return list[Math.floor(Math.random() * list.length)];
}

@Injectable()
export class UsersService {
  constructor(private repository: UsersRepository) {}

  // Create a simple user with no profile
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

  // Create a user with a profile
  async createUserWithProfile(params: {
    username: User[`username`];
    email: User[`email`];
    password: User[`password`];
    name: Profile[`name`];
    lastName: Profile[`lastname`];
    avatar?: Profile[`avatar`];
    bio?: Profile[`bio`];
    provider?: 'google' | 'facebook' | 'github' | '42';
    providerId?: string;
  }) {
    const hashedPassword = await argon.hash(params.password);
    const providerChecker = (
      provider: 'google' | 'facebook' | 'github' | '42' | undefined,
      toCheck: 'google' | 'facebook' | 'github' | '42',
    ): string | null => {
      if (toCheck === provider) {
        return params.providerId ?? '';
      }
      return null;
    };

    return this.repository.createUser({
      data: {
        username: params.username,
        email: params.email,
        password: hashedPassword,
        api42Id: providerChecker(params.provider, '42'),
        googleId: providerChecker(params.provider, 'google'),
        facebookId: providerChecker(params.provider, 'facebook'),
        profile: {
          create: {
            name: params.name,
            lastname: params.lastName,
            avatar: params.avatar ?? getRandomSpiderManAvatarUrl(),
            bio: params.bio,
          },
        },
      },
    });
  }

  async getUser(params: { id: User[`id`] }) {
    const { id } = params;
    return this.repository.getUser({ where: { id } });
  }

  // Return a user without password if found
  async getUserWithData(
    params: Partial<User>,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.repository.getUsers({
      where: params,
      take: 1,
      include: {
        profile: true,
        sessions: true,
      },
    });

    return user.length > 0 ? this.removePassword(user[0]) : null;
  }

  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User | null> {
    return this.repository.updateUser(params);
  }

  async updateUserProviderId(
    user: User,
    provider: 'google' | 'facebook' | 'github' | '42',
    providerId: string,
  ) {
    switch (provider) {
      case 'google':
        return this.repository.updateUser({
          where: { id: user.id },
          data: {
            googleId: providerId,
          },
        });
      case '42':
        return this.repository.updateUser({
          where: { id: user.id },
          data: {
            api42Id: providerId,
          },
        });
      default:
        return user;
    }
  }

  async getUserByEmail(email: User[`email`]) {
    return this.repository.getByEmail(email);
  }

  async getUserByUsername(username: User[`username`]) {
    return this.repository.getByUserName(username);
  }

  async getUsers() {
    const users = await this.repository.getUsers({});
    return users.map((user) => exclude(user, ['password']));
  }

  async getUsersWithProfiles() {
    const users = await this.repository.getUsers({
      include: { profile: true },
    });
    return users.map((user) => exclude(user, ['password']));
  }

  // take 1 because we only want one user
  async getUserBySessionId(sessionId: Session[`id`]) {
    return this.repository.getUsers({
      where: { sessions: { some: { id: sessionId } } },
      take: 1,
    });
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

  // util function to remove the hashed password field on the user object
  removePassword(user: User) {
    return exclude(user, ['password']);
  }

  // util function to remove all the hashed password fields on users
  removesPasswords(users: User[]) {
    return users.map((user) => exclude(user, ['password']));
  }
}
