import { IsInt, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoomInfoDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  roomId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roomType: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  oldPassword: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @MinLength(8, {
    message: 'Password must be at least 8 characters long',
  })
  password: string;
}
