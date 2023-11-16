import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  GameObservation as GameObservationDB,
  Visibility as VisibilityDB,
} from '@prisma/client';
import { Game } from './game.entity';
import { User } from '../../users/entities/user.entity';

registerEnumType(VisibilityDB, {
  name: 'Visibility',
});

@ObjectType()
export class GameObservation {
  @Field(() => User, { description: 'The user who observed the game.' })
  user: User;

  @Field(() => Game, { description: 'The game observed' })
  game: Game;
}
