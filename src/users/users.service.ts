import { Injectable } from '@nestjs/common';
import { BlockedUser, Prisma, Profile, Session, User } from '@prisma/client';
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

  async getBlockedUsers(userId: number) {
    const blockedUsers = await this.repository.getBlockedUsers(userId);
    const blockedUsersData = blockedUsers.map(
      (blockedUser) => blockedUser.blockedUser,
    );
    return blockedUsersData.map((blockedUser) =>
      exclude(blockedUser, ['password']),
    );
  }
  // Return a user without password if found
  async getUserWithData(params: Partial<User>): Promise<User | null> {
    const user = await this.repository.getUsers({
      where: params,
      take: 1,
      include: {
        profile: true,
        // sessions: true,
      },
    });

    return user.length > 0 ? user[0] : null;
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

  async getUsers(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
    include?: Prisma.UserInclude;
  }) {
    const { skip, take, cursor, where, orderBy, include } = params;
    const users = await this.repository.getUsers(params);
    return users.map((user) => exclude(user, ['password']));
  }
  async blockUser(userId: number, blockedUserId: number): Promise<BlockedUser> {
    try {
      await this.repository.deleteFriendRequest(userId, blockedUserId);
      await this.repository.removeFriend(userId, blockedUserId)
    } catch (e) {
      // Nothing to be done if there was an error
    }
    return this.repository.blockUser(userId, blockedUserId);
  }
  async unblockUser(
    userId: number,
    blockedUserId: number,
  ): Promise<BlockedUser> {
    return this.repository.unblockUser(userId, blockedUserId);
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
    return users.map((user) => exclude(user, ['password']));
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
    return this.repository.createSession({
      data: {
        token,
        ipAddress,
        userAgent,
        expiresAt,
        user: { connect: { id: user.id } },
      },
    });
  }

  async getSession(params: { id: Session[`id`] }) {
    const { id } = params;
    return this.repository.getSessions({ where: { id } });
  }

  async getSessionById(id: Session[`id`]) {
    return this.repository.getSession({ where: { id } });
  }

  async updateSession(
    sessionId: Session[`id`],
    refreshToken: Session[`token`],
    expiresAt: Session[`expiresAt`],
  ) {
    return this.repository.updateSession({
      where: { id: sessionId },
      data: { token: refreshToken, expiresAt },
    });
  }

  async deleteSession(params: { id: Session[`id`] }) {
    const { id } = params;
    return this.repository.deleteSession({ where: { id } });
  }

  // get all sessions for a user
  getAllUserSessions(params: { userId: User[`id`] }) {
    const { userId } = params;
    return this.repository.getSessions({
      where: { userId },
    });
  }

  // util function to remove the hashed password field on the user object
  removePassword(user: User) {
    return exclude(user, ['password']);
  }

  // util function to remove all the hashed password fields on users
  removesPasswords(users: User[]) {
    return users.map((user) => exclude(user, ['password']));
  }

  getFriends(id: number) {
    return this.repository.getFriends(id);
  }
  addFriend(userId: number, friendId: number) {
    return this.repository.addFriend(userId, friendId);
  }
  removeFriend(userId: number, friendId: number) {
    return this.repository.removeFriend(userId, friendId);
  }
  sendFriendRequest(userId: number, friendId: number) {
    return this.repository.addPendingContactRequest(userId, friendId);
  }
  allSentFriendRequests(userId: number) {
    return this.repository.allSentFriendRequests(userId);
  }

  receivedFriendRequests(userId: number) {
    return this.repository.receivedFriendRequests(userId);
  }

  cancelFriendRequest(requestId: number) {
    return this.repository.cancelFriendRequest(requestId);
  }
  approveFriendRequest(requestId: number) {
    return this.repository.approveFriendRequest(requestId);
  }

  async setTwoFactorAuthenticationSecret(secret: string, id: number) {
    return this.repository.updateUser({
      where: { id: id },
      data: {
        twoFactorSecret: secret,
      },
    });
  }

  async turnOnTwoFactorAuthentication(id: number) {
    return this.repository.updateUser({
      where: { id: id },
      data: {
        twoFactorEnabled: true,
      },
    });
  }
}
