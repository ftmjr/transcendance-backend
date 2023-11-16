import { Module } from '@nestjs/common';
import { CompetitionService } from './competition.service';
import { CompetitionResolver } from './competition.resolver';

@Module({
  providers: [CompetitionResolver, CompetitionService],
})
export class CompetitionModule {}
