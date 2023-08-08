import { ApiProperty } from '@nestjs/swagger';

export class RoomDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  protected: boolean;
}
