import { ApiProperty }  from '@nestjs/swagger';
import { InputType, Field  } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength } from 'class-validator';

@InputType()
export class CreateUserDto {
    @Field()
    @IsString()
    @MinLength(3)
    @ApiProperty()
    name: string;

    @Field()
    @IsEmail()
    @ApiProperty()
    email: string;
}
