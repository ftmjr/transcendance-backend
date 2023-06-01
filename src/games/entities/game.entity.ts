import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Game as GameDB, Visibility as VisibilityDB } from '@prisma/client';
import { User } from '../../users/entities/user.entity';
import { Competition } from '../../competition/entities';
import { GameHistory } from './gameHistory.entity';
import { GameParticipation } from './gameParticipation.entity';
import { GameObservation } from './gameObservation.entity';

registerEnumType(VisibilityDB, {
  name: 'Visibility',
});

@ObjectType()
export class Game {
  @Field(() => Int, { description: 'The unique ID of the game.' })
  id: GameDB[`id`];

  @Field({ description: 'The name of the game.' })
  name: string;

  @Field({ description: 'The description of the game.' })
  description: string;

  @Field(() => VisibilityDB, { description: 'The visibility of the game.' })
  visibility: VisibilityDB;

  @Field(() => Competition, {
    description: 'The competition the game is part of.',
    nullable: true,
  })
  competition?: Competition;

  @Field(() => User, { description: 'The winner of the game.', nullable: true })
  winner?: User;

  @Field(() => [GameHistory], { description: 'The history of the game.' })
  histories: GameHistory[];

  @Field(() => [GameParticipation], {
    description: 'The participants of the game.',
  })
  participants: GameParticipation[];

  @Field(() => [GameObservation], { description: 'The observers of the game.' })
  observers: GameObservation[];
}
