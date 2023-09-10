import { Injectable } from '@nestjs/common';
import {
  BlockedUser,
  GameEvent,
  Prisma,
  Profile,
  Session,
  Status,
  User,
} from '@prisma/client';
import { UsersRepository } from './users.repository';
import * as argon from 'argon2';
import { FriendsService } from '../friends/friends.service';

function exclude<User, Key extends keyof User>(
  user: User,
  keys: Key[],
): Omit<User, Key> {
  for (const key of keys) {
    delete user[key];
  }
  return user;
}

function getRandomAvatarUrl(): string {
  const serverBaseUrl = 'https://' + process.env.URL + '/api';
  const list = [
    'randomAvatars/icons8-bart-simpson-500.png',
    'randomAvatars/icons8-batman-500.png',
    'randomAvatars/icons8-character-500.png',
    'randomAvatars/icons8-deadpool-500.png',
    'randomAvatars/icons8-dj-500.png',
    'randomAvatars/icons8-finn-500.png',
    'randomAvatars/icons8-futurama-bender-500.png',
    'randomAvatars/icons8-homer-simpson-500.png',
    'randomAvatars/icons8-lisa-simpson-500.png',
    'randomAvatars/icons8-marge-simpson-500.png',
    'randomAvatars/icons8-owl-500.png',
    'randomAvatars/icons8-unicorn-500.png',
  ];
  const image = list[Math.floor(Math.random() * list.length)];
  return `${serverBaseUrl}/${image}`;
}

@Injectable()
export class UsersService {
  constructor(
    private repository: UsersRepository,
    private friendsService: FriendsService,
  ) {}

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
            avatar: params.avatar ?? getRandomAvatarUrl(),
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
  async getUserWithFriends(userId) {
    return this.repository.getUser({
      where: {
        id: userId,
      },
      include: {
        contacts: true,
        contactedBy: true,
      },
    });
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
        blockedUsers: true,
        blockedFrom: true,
        // sessions: true,
      },
    });
    return user.length > 0 ? user[0] : null;
  }

  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
    include?: Prisma.UserInclude;
  }): Promise<User | null> {
    return this.repository.updateUser(params);
  }
  async updateProfile(params: {
    where: Prisma.ProfileWhereUniqueInput;
    data: Prisma.ProfileUpdateInput;
  }): Promise<Profile | null> {
    return this.repository.updateProfile(params);
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

  async getUserBlocked(userId) {
    return await this.repository.getUserBlocked(userId);
  }
  async filterBlockedUsers(users, currentUser) {
    const userBlocked = await this.getUserBlocked(currentUser.id);
    const blockedUserIds = userBlocked.blockedUsers.map(
      (blockedUser) => blockedUser.blockedUserId,
    );
    const blockedFromIds = userBlocked.blockedFrom.map(
      (blockedFrom) => blockedFrom.userId,
    );

    const blockedUsers = users.filter((user) => {
      return (
        !blockedUserIds.includes(user.id) && !blockedFromIds.includes(user.id)
      );
    });
    return blockedUsers.map((user) => exclude(user, ['password']));
  }

  async getUsers(
    params: {
      skip?: number;
      take?: number;
      cursor?: Prisma.UserWhereUniqueInput;
      where?: Prisma.UserWhereInput;
      orderBy?: Prisma.UserOrderByWithRelationInput;
      include?: Prisma.UserInclude;
    },
    user,
  ) {
    const { skip, take, cursor, where, orderBy, include } = params;
    const users = await this.repository.getUsers(params);
    const allUsers = users.map((user) => exclude(user, ['password']));
    return await this.filterBlockedUsers(allUsers, user);
  }
  async getAllUsers(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
    include?: Prisma.UserInclude;
  }) {
    const users = await this.repository.getUsers(params);
    return users.map((user) => exclude(user, ['password']));
  }
  async blockUser(userId: number, blockedUserId: number): Promise<BlockedUser> {
    try {
      await this.friendsService.removeRequest(userId, blockedUserId);
      await this.friendsService.removeFriend(userId, blockedUserId);
    } catch (e) {
      // Nothing to be done if there was an error
    }
    return await this.repository.blockUser(userId, blockedUserId);
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
  getAllUserSessions(params: { userId: User[`id`]; limit?: number }) {
    const { userId, limit } = params;
    return this.repository.getSessions({
      where: { userId },
      take: limit,
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

  async turnOffTwoFactorAuthentication(id: number) {
    return this.repository.updateUser({
      where: { id: id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
  }
  async changeStatus(userId: number, status: Status) {
    await this.repository.updateProfile({
      where: {
        userId: userId,
      },
      data: {
        status: status,
      },
    });
  }
  async getUsersOrderedByWins() {
    const users = await this.repository.getUsersOrderedByWins();
    const usersNoPasswords = users.map((user) => exclude(user, ['password']));
    const usersWithScore = usersNoPasswords.map((user) => {
      const wins = user.gameHistories.filter(
        (history) => history.event === GameEvent.MATCH_WON,
      ).length;
      const loss = user.gameHistories.filter(
        (history) => history.event === GameEvent.MATCH_LOST,
      ).length;
      const score = wins - loss;
      return { ...user, score };
    });
    return usersWithScore.sort((a, b) => b.score - a.score);
  }
}
