import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { ChatRealtimeService } from './chatRealtime.service';
import { AuthenticatedGuard } from '../auth/guards';

import { CreateRoomDto } from './dto/createRoom.dto';
import { AvailableRoomsDto } from './dto/availableRooms.dto';
import { JoinRoomDto } from './dto/joinRoom.dto';
import { ChatRealtimeGateway } from './chatRealtime.gateway';
import { Status } from '@prisma/client';

@ApiTags('ChatActions')
@Controller('chat')
export class ChatRealtimeController {
  constructor(
    private service: ChatRealtimeService,
    private gateway: ChatRealtimeGateway,
  ) {}

  // @UseGuards(AuthenticatedGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve all public and protected rooms' })
  @ApiResponse({ status: 200, type: AvailableRoomsDto })
  @Get('rooms')
  async getAllRooms() {
    return await this.service.getRooms();
  }
  @UseGuards(AuthenticatedGuard)
  @ApiBearerAuth()
  @Post('new')
  @ApiOperation({
    summary: 'Create a chat room',
    description: `
      - Returns the created chat room
      - returns 403 if chatroom exist
    `,
  })
  @ApiResponse({ status: 200, description: `- Chatroom created',` })
  async createRoom(@Body() createRoomDto: CreateRoomDto) {
    // socket emit on updateRooms (Add)

    const room = await this.service.createRoom(createRoomDto);
    if (room) {
      this.gateway.updateRooms(room, 'add');
    }
    return room;
  }
  @Post('join')
  @ApiOperation({
    summary: 'Attempt to join a chat room',
    description: `
      - Returns the joined chat room
      - returns 404 if room doesn't exist, 403 if password invalid
    `,
  })
  @ApiResponse({ status: 200, description: `- Chatroom joined',` })
  async joinRoom(@Body() joinRoomDto: JoinRoomDto) {
    // socket emit on updateMembers.to(roomName) Dto with Add / Delete, Status
    return await this.service.joinRoom(joinRoomDto);
  }
  @Post('leave')
  @ApiOperation({
    summary: 'Leaves a chat room permanently',
    description: `
      - to be defined
    `,
  })
  @ApiResponse({ status: 200, description: `- Chatroom left',` })
  async leaveRoom(@Body() leaveRoomDto: JoinRoomDto) {
    // socket emit on updateMembers.to(roomName)
    // define LeaveRoomDto
    // return await this.service.leaveRoom(joinRoomDto);
  }
  @UseGuards(AuthenticatedGuard)
  @ApiBearerAuth()
  @Get('init')
  async initChatUser(@Request() req) {
    await this.service.setOnline(req.user, Status.Online);
    // const userRooms = await this.service.getUserRooms();
    // userRooms.forEach((room) => {
    //   this.gateway.joinRoom({roomName: room.name})
    // });
  }
}
