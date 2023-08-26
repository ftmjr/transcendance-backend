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
  Get,
  Param,
  Post,
  Query,
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
import { PaginationQuery } from '../users/dto/pagination-query.dto';
import { UserActionDto } from './dto/userAction.dto';

@ApiTags('ChatActions')
@Controller('chat')
export class ChatRealtimeController {
  constructor(
    private service: ChatRealtimeService,
    private gateway: ChatRealtimeGateway,
  ) {}

  @UseGuards(AuthenticatedGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve all public and protected rooms' })
  @ApiResponse({ status: 200, type: AvailableRoomsDto })
  @Get('rooms')
  async getAllRooms(@Request() req, @Query() queryParams: PaginationQuery) {
    const skip: number = parseInt(queryParams.skip);
    const take: number = parseInt(queryParams.take);
    return await this.service.getRooms({ skip, take }, req.user.id);
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
    console.log(createRoomDto);
    return await this.service.createRoom(createRoomDto);
  }
  @UseGuards(AuthenticatedGuard)
  @ApiBearerAuth()
  @Post('join')
  @ApiOperation({
    summary: 'Attempt to join a chat room',
    description: `
      - Returns the joined chat room
      - returns 404 if room doesn't exist, 403 if password invalid
    `,
  })
  @ApiResponse({ status: 200, description: `- Chatroom joined',` })
  async joinRoom(@Request() req, @Body() joinRoomDto: JoinRoomDto) {
    if (joinRoomDto.roomName === 'General') {
      return await this.service.joinGeneral(req.user);
    }
    return await this.service.joinRoom(joinRoomDto);
  }
  @UseGuards(AuthenticatedGuard)
  @ApiBearerAuth()
  @Post('leave/:id')
  @ApiOperation({
    summary: 'Leaves a chat room permanently',
    description: `
      - to be defined
    `,
  })
  @ApiResponse({ status: 200, description: `- Chatroom left',` })
  async leaveRoom(@Request() req, @Param('id') id: string) {
    const roomId = parseInt(id);
    return await this.service.leaveRoom(req.user, roomId);
  }
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Retrieve all members of a room' })
  @ApiResponse({ status: 200 })
  @Get('members/:id')
  async getRoomMembers(
    @Request() req,
    @Query() queryParams: PaginationQuery,
    @Param('id') id: string,
  ) {
    const skip: number = parseInt(queryParams.skip);
    const take: number = parseInt(queryParams.take);
    const roomId: number = parseInt(id);
    if (roomId === 0) {
      return await this.service.getGeneralMembers({ skip, take }, req.user);
    }
    return await this.service.getRoomMembers({ skip, take }, req.user, roomId);
  }
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Retrieve all members of a room' })
  @ApiResponse({ status: 200 })
  @Get('messages/:id')
  async getRoomMessages(
    @Request() req,
    @Query() queryParams: PaginationQuery,
    @Param('id') id: string,
  ) {
    const skip: number = parseInt(queryParams.skip);
    const take: number = parseInt(queryParams.take);
    const roomId: number = parseInt(id);
    if (roomId === 0) {
      return await this.service.getGeneralMessages({ skip, take }, req.user);
    }
    return await this.service.getRoomMessages({ skip, take }, req.user, roomId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Retrieve all messages of a dm' })
  @ApiResponse({ status: 200 })
  @Get('dm/:id')
  async getPrivateMessages(
    @Request() req,
    @Query() queryParams: PaginationQuery,
    @Param('id') id: string,
  ) {
    const skip: number = parseInt(queryParams.skip);
    const take: number = parseInt(queryParams.take);
    return await this.service.getPrivateMessages(
      { skip, take },
      req.user.id,
      parseInt(id),
    );
  }
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Retrieve all dm conversations of a user' })
  @ApiResponse({ status: 200 })
  @Get('dm')
  async getConversations(@Request() req) {
    return await this.service.getConversations(req.user.id);
  }
}
