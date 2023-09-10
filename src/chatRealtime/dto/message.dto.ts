import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class MessageDto {
  @ApiProperty()
  @IsNotEmpty()
  content: number;

  @ApiProperty()
  @IsOptional()
  password?: string;
}
