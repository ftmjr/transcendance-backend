import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesResolver } from './games.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { GamesRepository } from './games.repository';

@Module({
  imports: [PrismaModule],
  providers: [GamesResolver, GamesRepository, GamesService],
  exports: [GamesService],
})
export class GamesModule {}
