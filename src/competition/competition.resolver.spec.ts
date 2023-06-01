import { Test, TestingModule } from '@nestjs/testing';
import { CompetitionResolver } from './competition.resolver';
import { CompetitionService } from './competition.service';

describe('CompetitionResolver', () => {
  let resolver: CompetitionResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompetitionResolver, CompetitionService],
    }).compile();

    resolver = module.get<CompetitionResolver>(CompetitionResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
