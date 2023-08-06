import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get, Param,
  Post,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { ChatRealtimeService } from './chatRealtime.service';
import { AuthenticatedGuard } from '../auth/guards';

import { CreateRoomDto } from './dto/createRoom.dto';
import { AvailableRoomsDto } from './dto/availableRooms.dto';

@ApiTags('ChatActions')
@Controller('chat')
export class ChatRealtimeController {
  constructor(private service: ChatRealtimeService) {}

  // @UseGuards(AuthenticatedGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retrieve all public and protected rooms',
  })
  @ApiResponse({
    status: 200,
    type: AvailableRoomsDto,
  })
  @Get('rooms')
  async getAllRooms() {
    return await this.service.getRooms();
  }
  @UseGuards(AuthenticatedGuard)
  @ApiBearerAuth()
  @Delete('leave/:id')
  @ApiOperation({
    summary: 'Leave a chat room',
    description: `
      - Delete user from room participants
      - Set a new room owner or delete the room
    `,
  })
  @ApiResponse({
    status: 200,
    description: `
    - User properly left the room',
    `,
  })
  async leaveRoom(@Request() req, @Param('id') id: string) {
    const roomId = parseInt(id);
    return await this.service.leaveRoom(req.user, roomId);
  }

  // @UseGuards(AuthenticatedGuard)
  // @ApiBearerAuth()
  // @Post('join/:id')
  // @ApiOperation({
  //   summary: 'Attempt to join a chat room',
  //   description: `
  //     - Verify if user can join the chat
  //     - Add the user to the chatroom members
  //   `,
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: `
  //   - User properly joined the chatroom',
  //   `,
  // })
  // async joinRoom(@Request() req, @Param('id') id: string) {
  //   const roomId = parseInt(id);
  //   return await this.service.joinRoom(req.user, roomId);
  // }
}
