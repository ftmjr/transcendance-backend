import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class JoinRoomDto {
  @ApiProperty()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsOptional()
  password?: string;

  @ApiProperty()
  @IsNotEmpty()
  protected: boolean;

  @ApiProperty()
  @IsNotEmpty()
  private: boolean;
}
