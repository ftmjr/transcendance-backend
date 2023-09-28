import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Controller, Get, ParseIntPipe, Patch, Req } from '@nestjs/common';
import { ChatRealtimeService } from './chatRealtime.service';
import {
  CreateRoomDto,
  JoinRoomDto,
  LeaveRoomDto,
  UpdatePasswordDto,
} from './dto';
import { AuthenticatedGuard } from '../auth/guards';
import { Body, Post, Param, UseGuards } from '@nestjs/common';
import * as express from 'express';
import { User } from '@prisma/client';

type RequestWithUser = express.Request & { user: User };

@ApiTags('ChatActions')
@Controller('chat')
export class ChatRealtimeController {
  constructor(private service: ChatRealtimeService) {}

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
}
