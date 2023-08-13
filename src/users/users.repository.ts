import { Injectable } from '@nestjs/common';
import { Prisma, Session, User, Profile, ContactRequest } from '@prisma/client';
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
    return this.prisma.profile.update({where, data});
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

  async getFriends(id: number): Promise<Profile[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: id },
      include: {
        contacts: {
          include: {
            contact: {
              include: {
                profile: true, // Include the profile of each contact
              },
            },
          },
        },
      },
    });

    if (!user) {
      // Handle the case where the user is not found
      throw new Error(`User with id: ${id} not found.`);
    }

    return user.contacts.map((contact) => contact.contact.profile);
  }
  async addFriend(userId: number, id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const friend = await this.prisma.user.findUnique({
      where: { id: id },
    });

    if (!user || !friend) {
      throw new Error('User or friend not found');
    }

    // Create a new Contact record linking the user and friend
    const contact = await this.prisma.contact.create({
      data: {
        userId: userId,
        contactId: id,
      },
    });

    return contact;
  }
  async removeFriend(userId: number, friendId: number) {
    // Check if both user and friend IDs exist in the database
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const friend = await this.prisma.user.findUnique({
      where: { id: friendId },
    });

    if (!user || !friend) {
      throw new Error('User or friend not found');
    }

    // Find and delete the Contact record that links the user and friend
    const contact = await this.prisma.contact.findFirst({
      where: {
        userId: userId,
        contactId: friendId,
      },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    return await this.prisma.contact.delete({
      where: {
        id: contact.id,
      },
    });
  }

  async addPendingContactRequest(
    senderId: number,
    receiverId: number,
  ): Promise<ContactRequest> {
    // Check if both sender and receiver IDs exist in the database
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
    });

    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!sender || !receiver) {
      throw new Error('Sender or receiver not found');
    }

    // Create a new ContactRequest record linking the sender and receiver
    const contactRequest = await this.prisma.contactRequest.create({
      data: {
        senderId: senderId,
        receiverId: receiverId,
      },
    });

    return contactRequest;
  }
  async cancelFriendRequest(requestId: number) {
    const deleteRequest = await this.prisma.contactRequest.delete({
      where: {
        id: requestId,
      },
    });

    return deleteRequest;
  }
  async allSentFriendRequests(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        sentContactRequests: true,
      },
    });

    if (!user) {
      // Handle the case where the user is not found
      throw new Error(`User with id: ${userId} not found.`);
    }

    return user.sentContactRequests;
  }
  async receivedFriendRequests(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        receivedContactRequests: true,
      },
    });

    if (!user) {
      // Handle the case where the user is not found
      throw new Error(`User with id: ${userId} not found.`);
    }

    return user.receivedContactRequests;
  }
  async approveFriendRequest(requestId: number) {
    const deleteRequest = await this.prisma.contactRequest.delete({
      where: {
        id: requestId,
      },
    });
    const newFriend = await this.prisma.contact.create({
      data: {
        userId: deleteRequest.senderId,
        contactId: deleteRequest.receiverId,
      },
    });

    return newFriend;
  }
}
