import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatRepository } from './chat.repository';

@Module({
  providers: [ChatController, ChatRepository, ChatService, ChatGateway],
  imports: [],
})
export class ChatRealtimeModule {}
