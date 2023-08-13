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
import { AuthGuard } from '@nestjs/passport';
import {UserActionDto} from "./dto/userAction.dto";

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
    return await this.service.getRoomMembers(
      { skip, take },
      req.user.id,
      roomId,
    );
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
    return await this.service.getRoomMessages(
      { skip, take },
      req.user.id,
      roomId,
    );
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Kick a user from a room' })
  @ApiResponse({ status: 200 })
  @Get('kick')
  async kickUser(
    @Request() req,
    @Query() queryParams: PaginationQuery,
    @Body() userActionDto: UserActionDto,
  ) {
    const kickedUser = await this.service.kickChatRoomMember(
      req.user.id,
      userActionDto,
    );
    if (kickedUser) {
    //   this.gateway.updateMembers();
    }
  }
  // @ApiBearerAuth()
  // @UseGuards(AuthenticatedGuard)
  // @ApiOperation({ summary: 'ban a user from a room' })
  // @ApiResponse({ status: 200 })
  // @Get('ban')
  // async banUser(
  //   @Request() req,
  //   @Query() queryParams: PaginationQuery,
  //   @Body() userActionDto: UserActionDto,
  // ) {
  //   return await this.service.banChatRoomMember(req.user.id, userActionDto);
  // }
  // @ApiBearerAuth()
  // @UseGuards(AuthenticatedGuard)
  // @ApiOperation({ summary: 'mute a user from a room' })
  // @ApiResponse({ status: 200 })
  // @Get('mute')
  // async muteUnmuteUser(
  //   @Request() req,
  //   @Query() queryParams: PaginationQuery,
  //   @Body() userActionDto: UserActionDto,
  // ) {
  //   return await this.service.muteUnmuteChatRoomMember(req.user.id, userActionDto);
  // }
}
