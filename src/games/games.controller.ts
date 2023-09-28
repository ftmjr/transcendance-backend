import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { GamesService } from './games.service';
import { CreateGameSessionDto } from './dto';
import { AuthenticatedGuard } from '../auth/guards';
import { GameSessionService } from './game-session.service';
import { User } from '@prisma/client';
import { GameSession } from './interfaces';
import * as express from 'express';

type RequestWithUser = express.Request & { user: User };
@ApiTags('Game')
@Controller('game')
export class GamesController {
  constructor(
    private gameSessionService: GameSessionService,
    private gamesService: GamesService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Post('/start')
  @ApiOperation({ summary: 'Start a new game session' })
  @ApiResponse({
    status: 200,
    description: 'Game session started successfully.',
  })
  async startGameSession(
    @Body() createGameSessionDto: CreateGameSessionDto,
    @Req() req: RequestWithUser,
  ): Promise<GameSession> {
    const user = req.user;
    return this.gameSessionService.startAGameSession(
      createGameSessionDto,
      user,
    );
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Post('/join-queue')
  @ApiOperation({ summary: 'Join the game session queue' })
  @ApiResponse({ status: 200, description: 'Joined the queue successfully.' })
  async joinQueue(@Req() req: RequestWithUser): Promise<GameSession> {
    const user = req.user;
    return this.gameSessionService.joinQueue(user);
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Get('/queued-sessions-count')
  @ApiOperation({ summary: 'Get the number of queued sessions available' })
  @ApiResponse({
    status: 200,
    description: 'Retrieved the count successfully.',
  })
  getQueuedSessionsCount(): number {
    return this.gameSessionService.getNumberOfPlayerWaitingForAnOpponent();
  }
}
