import { Module } from '@nestjs/common';
import { ChatRealtimeGateway } from './chatRealtime.gateway';
import { ChatRealtimeService } from './chatRealtime.service';
import { ChatRealtimeController } from './chatRealtime.controller';
import { ChatRealtimeRepository } from './chatRealtime.repository';
import { UsersModule } from "../users/users.module";
import { AuthModule } from "../auth/auth.module";
import { JwtModule } from "@nestjs/jwt";

@Module({
  providers: [ChatRealtimeRepository, ChatRealtimeService, ChatRealtimeGateway],
  imports: [UsersModule, AuthModule, JwtModule, UsersModule],
  controllers: [ChatRealtimeController],
})
export class ChatRealtimeModule {}
