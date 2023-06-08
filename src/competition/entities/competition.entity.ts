import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  Competition as CompetitionDB,
  Visibility as VisibilityDB,
} from '@prisma/client';
import { Game } from '../../games/entities';

registerEnumType(VisibilityDB, {
  name: 'Visibility',
});

@ObjectType()
export class Competition {
  @Field(() => Int, { description: 'The unique ID of the competition.' })
  id: CompetitionDB[`id`];

  @Field({ description: 'The name of the competition.' })
  name: string;

  @Field({ description: 'The description of the competition.' })
  description: string;

  @Field(() => VisibilityDB, {
    description: 'The visibility of the competition.',
  })
  visibility: VisibilityDB;

  @Field(() => [Game], { description: 'The games in the competition.' })
  games: Game[];
}
