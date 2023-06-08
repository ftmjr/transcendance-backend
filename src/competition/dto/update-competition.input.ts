import { CreateCompetitionInput } from './create-competition.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateCompetitionInput extends PartialType(CreateCompetitionInput) {
  @Field(() => Int)
  id: number;
}
