import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ManagedTheme } from '../interfaces';

class OpponentDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  userId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class GameRulesDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  maxScore: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  maxTime: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  theme?: ManagedTheme;
}

export class CreateGameSessionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  againstBot: boolean;

  @ApiProperty()
  @IsOptional()
  opponent?: OpponentDto;

  @ApiProperty()
  @IsOptional()
  rules?: GameRulesDto;
}
