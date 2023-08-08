import { Module } from '@nestjs/common';
import { ChatRealtimeGateway } from './chatRealtime.gateway';
import { ChatRealtimeService } from "./chatRealtime.service";
import { ChatRealtimeController } from "./chatRealtime.controller";
import { ChatRealtimeRepository } from "./chatRealtime.repository";

@Module({
  providers: [ChatRealtimeRepository, ChatRealtimeService, ChatRealtimeGateway],
  imports: [],
  controllers: [ChatRealtimeController],
})
export class ChatRealtimeModule {}
