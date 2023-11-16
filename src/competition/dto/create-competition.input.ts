import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateCompetitionInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
