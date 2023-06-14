import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { GamesModule } from './games/games.module';
import { CompetitionModule } from './competition/competition.module';
import { UsersModule } from './users/users.module';
import { ChatRealtimeModule } from './chatRealtime/chatRealtime.module';
import { GameRealtimeModule } from './gameRealtime/gameRealtime.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    GamesModule,
    CompetitionModule,
    ChatRealtimeModule,
    GameRealtimeModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
