import { Module } from '@nestjs/common';
import { MessageController } from './message.controller';
import { NotificationService } from './notification.service';
import { MessageService } from './message.service';
import { MessageRepository } from './message.repository';
import { NotificationRepository } from './notification.repository';
import { NotificationGateway } from './notification.gateway';

@Module({
  controllers: [MessageController],
  providers: [
    MessageService,
    MessageRepository,
    NotificationGateway,
    NotificationService,
    NotificationRepository,
  ],
  exports: [MessageService, NotificationService],
})
export class MessageModule {}
