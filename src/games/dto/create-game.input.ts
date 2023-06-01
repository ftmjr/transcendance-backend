import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Visibility } from '@prisma/client';

@InputType()
export class CreateGameInput {
  @Field()
  @IsNotEmpty()
  @ApiProperty()
  name: string;

  @Field()
  @IsNotEmpty()
  @ApiProperty()
  description: string;

  @Field(() => Visibility)
  @IsEnum(Visibility)
  @ApiProperty({ enum: Visibility })
  visibility: Visibility;

  @Field({ nullable: true })
  @ApiProperty({ required: false })
  competitionId?: number;

  @Field({ nullable: true })
  @ApiProperty({ required: false })
  winnerId?: number;
}
