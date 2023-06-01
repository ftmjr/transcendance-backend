import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Visibility } from '@prisma/client';

@InputType()
export class UpdateGameInput {
  @Field()
  @IsNotEmpty()
  @ApiProperty({ required: true })
  id: number;

  @Field({ nullable: true })
  @IsNotEmpty()
  @ApiProperty({ required: false })
  name?: string;

  @Field({ nullable: true })
  @IsNotEmpty()
  @ApiProperty({ required: false })
  description?: string;

  @Field(() => Visibility, { nullable: true })
  @IsEnum(Visibility)
  @ApiProperty({ enum: Visibility, required: false })
  visibility?: Visibility;

  @Field({ nullable: true })
  @ApiProperty({ required: false })
  competitionId?: number;

  @Field({ nullable: true })
  @ApiProperty({ required: false })
  winnerId?: number;
}
