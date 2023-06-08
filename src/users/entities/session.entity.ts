import { Field, Int, ObjectType } from '@nestjs/graphql';
import { User } from './user.entity';

@ObjectType()
export class Session {
  @Field(() => Int, { description: 'The unique ID of the session.' })
  id: number;

  @Field(() => User)
  user: User;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field({ nullable: true })
  ipAddress?: string;

  @Field({ nullable: true })
  userAgent?: string;
}
