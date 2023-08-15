import { ApiProperty } from '@nestjs/swagger';
import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class UserActionDto {
  @Field()
  @ApiProperty()
  @IsNotEmpty()
  roomId: number;

  @Field()
  @ApiProperty()
  @IsNotEmpty()
  memberId: number;
}
