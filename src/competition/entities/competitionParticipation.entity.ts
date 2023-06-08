import { Field, ObjectType } from '@nestjs/graphql';
import { CompetitionParticipation as CompetitionParticipationDB } from '@prisma/client';
import { User } from '../../users/entities';
import { Competition } from './competition.entity';

@ObjectType()
export class CompetitionParticipation {
  @Field(() => User, {
    description: 'The user who participated in the competition.',
  })
  user: User;

  @Field(() => Competition, {
    description: 'The competition in which the user participated.',
  })
  competition: Competition;
}
