import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  GameHistory as GameHistoryDB,
  GameEvent as GameEventDB,
} from '@prisma/client';
import { Game } from './game.entity';
import { User } from '../../users/entities/user.entity';

registerEnumType(GameEventDB, {
  name: 'GameEvent',
});

@ObjectType()
export class GameHistory {
  @Field(() => Int, { description: 'The unique ID of the game history.' })
  id: GameHistoryDB[`id`];

  @Field(() => GameEventDB, { description: 'The event of the game history.' })
  event: GameEventDB;

  @Field(() => User, { description: 'The user who triggered the event.' })
  user: User;

  @Field(() => Game, { description: 'The game of the game history.' })
  game: Game;
}
