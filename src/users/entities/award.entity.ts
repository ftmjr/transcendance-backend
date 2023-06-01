import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Award as AwardDB } from '@prisma/client';

@ObjectType()
export class Award {
  @Field(() => Int, { description: 'The unique ID of the award.' })
  id: AwardDB[`id`];

  @Field({ description: 'The name of the award.' })
  name: string;

  @Field({ description: 'The description of the award.' })
  description: string;

  @Field({ description: 'The image URL of the award.' })
  image: string;
}
