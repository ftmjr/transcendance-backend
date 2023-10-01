import { Module } from '@nestjs/common';
import { ChatRealtimeService } from './chatRealtime.service';
import { ChatRealtimeController } from './chatRealtime.controller';
import { ChatRealtimeRepository } from './chatRealtime.repository';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { MessageModule } from '../message/message.module';
import { ChatRealtimeGateway } from './chatRealtime.gateway';

@Module({
  imports: [UsersModule, AuthModule, JwtModule, MessageModule],
  controllers: [ChatRealtimeController],
  providers: [ChatRealtimeRepository, ChatRealtimeService, ChatRealtimeGateway],
  exports: [ChatRealtimeService],
})
export class ChatRealtimeModule {}
