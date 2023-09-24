import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class JoinRoomDto {
  @ApiProperty()
  @IsNotEmpty()
  userId: number;

  @ApiProperty()
  @IsOptional()
  password?: string;
}
