import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty()
  @IsNotEmpty()
  ownerId: number;

  @ApiProperty()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsOptional()
  password?: string;

  @ApiProperty()
  @IsNotEmpty()
  private: boolean;
  @ApiProperty()
  @IsNotEmpty()
  protected: boolean;
}
