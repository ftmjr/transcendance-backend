import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GamesRepository } from './games.repository';

@Module({
  imports: [PrismaModule],
  providers: [GamesRepository, GamesService],
  exports: [GamesService],
})
export class GamesModule {}
