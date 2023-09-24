import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Controller, Patch, Req } from '@nestjs/common';
import { ChatRealtimeService } from './chatRealtime.service';
import { CreateRoomDto, JoinRoomDto, UpdatePasswordDto } from './dto';
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
    @Param('roomId') roomId: number,
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
}
