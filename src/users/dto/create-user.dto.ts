import { ApiProperty } from '@nestjs/swagger';
import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

@InputType()
export class CreateUserDto {
  @Field()
  @ApiProperty()
  @Length(3, 20)
  @IsString()
  @IsNotEmpty()
  username: string;

  @Field()
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Field()
  @ApiProperty()
  @Length(6, 32)
  @IsString()
  @IsNotEmpty()
  password: string;
}
