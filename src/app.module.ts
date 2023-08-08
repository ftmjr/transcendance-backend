import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { GamesModule } from './games/games.module';
import { CompetitionModule } from './competition/competition.module';
import { UsersModule } from './users/users.module';
import { ChatRealtimeModule } from './chatRealtime/chatRealtime.module';
import { GameRealtimeModule } from './gameRealtime/gameRealtime.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    GamesModule,
    CompetitionModule,
    ChatRealtimeModule,
    GameRealtimeModule,
    CacheModule.register(),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
