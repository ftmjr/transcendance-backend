import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from "./chat.service";
import { ChatController } from "./chat.controller";

@Module({
  providers: [ChatController, ChatService, ChatGateway],
  imports: [],
})
export class ChatRealtimeModule {}
