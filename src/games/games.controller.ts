import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GamesService } from './games.service';
import { CreateGameSessionDto } from './dto';
import { AuthenticatedGuard } from '../auth/guards';
import { GameSessionService } from './game-session.service';
import { GameSession } from './interfaces';
import { RequestWithUser } from '../users/users.controller';

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
  @Post('/accept-invitation')
  @ApiOperation({ summary: 'Accept Invitation to a game' })
  @ApiResponse({
    status: 200,
    description: 'Accepted the invitation successfully.',
  })
  async acceptInvitation(
    @Req() req: RequestWithUser,
    @Body() { gameId }: { gameId: number },
  ) {
    const user = req.user;
    return this.gameSessionService.acceptGameInvitation(gameId, user);
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Post('/reject-invitation')
  @ApiOperation({ summary: 'Reject game invitation' })
  @ApiResponse({
    status: 200,
    description: 'Rejected the invitation successfully.',
  })
  async rejectInvitation(
    @Req() req: RequestWithUser,
    @Body() { gameId }: { gameId: number },
  ) {
    const user = req.user;
    return this.gameSessionService.refuseGameInvitation(gameId, user);
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Get('sessions')
  @ApiOperation({ summary: 'Get all game sessions of the user' })
  @ApiResponse({
    status: 200,
    description: 'Retrieved all game sessions successfully.',
  })
  async getAllGameSessions(
    @Req() req: RequestWithUser,
  ): Promise<GameSession[]> {
    const user = req.user;
    return this.gameSessionService.getUserGameSessions(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Delete('/sessions')
  @ApiOperation({ summary: 'Delete a game session' })
  @ApiResponse({
    status: 200,
    description: 'Deleted the game session successfully.',
  })
  async deleteGameSession(
    @Req() req: RequestWithUser,
    @Body() { gameId }: { gameId: number },
  ) {
    const user = req.user;
    return this.gameSessionService.deleteGameSessionByUser(gameId, user.id);
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

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Get('/status/:userId')
  @ApiOperation({ summary: 'Get the status of a user' })
  @ApiResponse({
    status: 200,
    description: 'Retrieved the status successfully.',
  })
  async getUserStatus(
    @Req() req: RequestWithUser,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<{
    status: 'playing' | 'inQueue' | 'free';
    gameSession?: GameSession;
  }> {
    const user = req.user;
    return this.gameSessionService.getUserGameStatus(userId, user);
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Post('status')
  @ApiOperation({ summary: 'Get the status of many users' })
  @ApiResponse({
    status: 200,
    description: 'Retrieved the status successfully.',
  })
  async getUsersStatus(
    @Req() req: RequestWithUser,
    @Body() { userIds }: { userIds: number[] },
  ): Promise<
    {
      status: 'playing' | 'inQueue' | 'free';
      gameSession?: GameSession;
    }[]
  > {
    const user = req.user;
    return this.gameSessionService.getUsersGameStatus(userIds, user);
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Get('/watch-game/:gameId')
  @ApiOperation({ summary: 'Watch a game' })
  @ApiResponse({
    status: 200,
    description: 'Retrieved the game successfully.',
  })
  async watchGame(
    @Req() req: RequestWithUser,
    @Param('gameId', ParseIntPipe) gameId: number,
  ): Promise<GameSession> {
    return this.gameSessionService.addViewerToGameSession(gameId, req.user);
  }
}
