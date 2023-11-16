import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  GameParticipation as GameParticipationDB,
  Visibility as VisibilityDB,
} from '@prisma/client';
import { Game } from './game.entity';
import { User } from '../../users/entities/user.entity';

registerEnumType(VisibilityDB, {
  name: 'Visibility',
});

@ObjectType()
export class GameParticipation {
  @Field(() => User, { description: 'The user who participated in the game.' })
  user: User;

  @Field(() => Game, { description: 'The game in which he participate.' })
  game: Game;
}
