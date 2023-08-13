import { Module } from '@nestjs/common';
import { ChatRealtimeGateway } from './chatRealtime.gateway';
import { ChatRealtimeService } from './chatRealtime.service';
import { ChatRealtimeController } from './chatRealtime.controller';
import { ChatRealtimeRepository } from './chatRealtime.repository';
import { UsersModule } from "../users/users.module";

@Module({
  providers: [ChatRealtimeRepository, ChatRealtimeService, ChatRealtimeGateway],
  imports: [UsersModule],
  controllers: [ChatRealtimeController],
})
export class ChatRealtimeModule {}
