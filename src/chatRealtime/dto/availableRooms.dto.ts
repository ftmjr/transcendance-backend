import { ApiProperty } from '@nestjs/swagger';
import { RoomDto } from './room.dto';

export class AvailableRoomsDto {
  @ApiProperty({ type: () => RoomDto })
  rooms?: RoomDto[];
}
