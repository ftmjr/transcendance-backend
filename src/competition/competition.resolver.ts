import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { CompetitionService } from './competition.service';
import { Competition } from './entities/competition.entity';
import { CreateCompetitionInput } from './dto/create-competition.input';
import { UpdateCompetitionInput } from './dto/update-competition.input';

@Resolver(() => Competition)
export class CompetitionResolver {
  constructor(private readonly competitionService: CompetitionService) {}

  @Mutation(() => Competition)
  createCompetition(@Args('createCompetitionInput') createCompetitionInput: CreateCompetitionInput) {
    return this.competitionService.create(createCompetitionInput);
  }

  @Query(() => [Competition], { name: 'competition' })
  findAll() {
    return this.competitionService.findAll();
  }

  @Query(() => Competition, { name: 'competition' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.competitionService.findOne(id);
  }

  @Mutation(() => Competition)
  updateCompetition(@Args('updateCompetitionInput') updateCompetitionInput: UpdateCompetitionInput) {
    return this.competitionService.update(updateCompetitionInput.id, updateCompetitionInput);
  }

  @Mutation(() => Competition)
  removeCompetition(@Args('id', { type: () => Int }) id: number) {
    return this.competitionService.remove(id);
  }
}
