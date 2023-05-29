import { Field, Int, ObjectType } from '@nestjs/graphql';
import { User as UserDB } from '@prisma/client';

@ObjectType()
export class User {
    @Field(() => Int)
    id: UserDB[`id`];

    @Field(() => String)
    name: UserDB[`name`];

    @Field(() => String)
    email: UserDB[`email`];
}
