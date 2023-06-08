import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Prisma, Profile as ProfileDB } from '@prisma/client';
import { User } from './user.entity';
import { Award } from './award.entity';

@ObjectType()
export class Profile {
  @Field(() => Int, { description: 'The unique ID of the profile.' })
  id: ProfileDB[`id`];

  @Field(() => User)
  user: User;

  @Field({ nullable: true })
  avatar?: string;

  @Field({ nullable: true })
  bio?: string;

  @Field(() => [Award])
  awards: Award[];
}
