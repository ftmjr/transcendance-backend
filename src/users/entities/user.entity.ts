import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { User as UserDB, Role as RoleDB } from '@prisma/client';
import { Profile } from './profile.entity';
import { Session } from './session.entity';
import {
  Game,
  GameParticipation,
  GameObservation,
  GameHistory,
} from '../../games/entities';
import { CompetitionParticipation } from '../../competition/entities';

// TODO: implement other entities
// import { Group } from 'path/to/group.entity
// import { Contact } from 'path/to/contact.entity';

registerEnumType(RoleDB, {
  name: 'Role',
});

@ObjectType()
export class User {
  @Field(() => Int, { description: 'The unique ID of the user.' })
  id: UserDB[`id`];

  @Field({ description: 'The username of the user.' })
  username: string;

  @Field({ description: 'The email of the user.' })
  email: string;

  @Field({ description: 'The password of the user.' })
  password: string;

  @Field(() => RoleDB, { description: 'The role of the user.' })
  role: RoleDB;

  @Field(() => Profile, { nullable: true })
  profile?: Profile;

  @Field(() => [Session])
  sessions: Session[];

  @Field(() => [Game])
  games: Game[];

  // @Field(() => [Group])
  // groups: Group[];

  @Field(() => [GameParticipation])
  gameParticipations: GameParticipation[];

  @Field(() => [GameObservation])
  gameObservations: GameObservation[];

  @Field(() => [CompetitionParticipation])
  competitionParticipations: CompetitionParticipation[];

  @Field(() => [GameHistory])
  gameHistories: GameHistory[];

  // @Field(() => [Contact])
  // contacts: Contact[];
  //
  // @Field(() => [Contact])
  // contactedBy: Contact[];

  @Field({ nullable: true })
  googleId?: string;

  @Field({ nullable: true })
  facebookId?: string;

  @Field({ nullable: true })
  api42Id?: string;

  @Field({ nullable: true })
  twoFactorSecret?: string;

  @Field()
  twoFactorEnabled: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
