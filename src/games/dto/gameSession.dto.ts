import { IsBoolean, IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGameSessionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  againstBot: boolean;

  @ApiProperty()
  @IsOptional()
  @IsInt()
  opponent?: number;
}
