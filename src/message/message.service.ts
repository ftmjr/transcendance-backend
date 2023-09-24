import { Injectable } from '@nestjs/common';
import { User, PrivateMessage } from '@prisma/client';
import { MessageRepository } from './message.repository';
import { UserWithoutSensitiveInfo } from '../users/users.service';
import { CreateMessageDto } from './dto';

@Injectable()
export class MessageService {
  constructor(private readonly messageRepository: MessageRepository) {}

  async createPrivateMessage(
    data: CreateMessageDto,
    sender: User,
  ): Promise<PrivateMessage> {
    try {
      return this.messageRepository.createPrivateMessage({
        text: data.content,
        receiver: {
          connect: {
            id: data.receiverId,
          },
        },
        sender: {
          connect: {
            id: sender.id,
          },
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async getPrivateMessages(
    userOneId: User[`id`],
    userTwoId: User[`id`],
    params: { skip: number; take: number },
  ): Promise<PrivateMessage[]> {
    return this.messageRepository.getPrivateMessages(
      userOneId,
      userTwoId,
      params,
    );
  }

  async getUniqueConversations(
    userId: User[`id`],
  ): Promise<UserWithoutSensitiveInfo[]> {
    return this.messageRepository.getUniqueConversations(userId);
  }
}
