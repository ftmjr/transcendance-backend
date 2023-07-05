import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GamesModule } from '../games/games.module';
import { GameRealtimeService } from './gameRealtime.service';

@Module({
  imports: [GamesModule],
  providers: [GameGateway, GameRealtimeService],
})
export class GameRealtimeModule {}
