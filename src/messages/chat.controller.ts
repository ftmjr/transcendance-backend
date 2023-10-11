import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Get, ParseIntPipe, Patch, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import {
  CreateRoomDto,
  JoinRoomDto,
  LeaveRoomDto,
  UpdatePasswordDto,
} from './dto';
import { AuthenticatedGuard } from '../auth/guards';
import { Body, Post, Param, UseGuards } from '@nestjs/common';
import { RequestWithUser } from '../users/users.controller';

@ApiTags('ChatActions')
@Controller('chat')
export class ChatController {
  constructor(private service: ChatService) {}

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Post('create-room')
  async createRoom(
    @Req() req: RequestWithUser,
    @Body() createRoomDto: CreateRoomDto,
  ) {
    // Assume ownerId is obtained from the request after authentication
    const ownerId = 1; // replace with actual ownerId
    return this.service.createRoom(createRoomDto, ownerId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Post('join-room/:roomId')
  async joinRoom(
    @Req() req: RequestWithUser,
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() joinRoomDto: JoinRoomDto,
  ) {
    const actorId = req.user.id; // replace with actual actorId
    return this.service.addUserToARoom(
      {
        roomId,
        ...joinRoomDto,
      },
      actorId,
    );
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Patch('update-password')
  async updateRoomPassword(
    @Req() req: RequestWithUser,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    const userId = req.user.id;
    return this.service.updateRoomPassword(updatePasswordDto, userId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Post('leave-room')
  async leaveRoom(
    @Req() req: RequestWithUser,
    @Body() leaveRoomDto: LeaveRoomDto,
  ) {
    const { roomId, userId } = leaveRoomDto;
    return this.service.removeUserFromRoom(roomId, userId, req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Post('delete-room/:roomId')
  async deleteRoom(
    @Req() req: RequestWithUser,
    @Param('roomId', ParseIntPipe) roomId: number,
  ) {
    const userId = req.user.id;
    return this.service.deleteRoom(roomId, userId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Get('public')
  async getPublicRooms() {
    return this.service.getPublicRooms();
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Get all rooms where user is a member' })
  @Get('rooms')
  async getRooms(@Req() req: RequestWithUser) {
    const userId = req.user.id;
    return this.service.getUserRooms(userId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Get all room members, can failed if user not a member',
  })
  @Get('room/:roomId')
  async getRoomInfo(
    @Req() req: RequestWithUser,
    @Param('roomId', ParseIntPipe) roomId: number,
  ) {
    const userId = req.user.id;
    return this.service.getRoomMembers(roomId, userId);
  }
}
