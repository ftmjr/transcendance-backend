// src/games/games-session.service.ts
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  GameSession,
  GameSessionType,
  GameMonitorState,
  Gamer,
  GameRules,
} from './interfaces';
import { CreateGameSessionDto } from './dto';
import { Game, GameEvent, GameHistory, User } from '@prisma/client';
import { GamesService } from './games.service';
import { NotificationService } from '../notifications/notification.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class GameSessionService {
  private gameSessions: Map<number, GameSession> = new Map();

  constructor(
    private gameService: GamesService,
    private userRepository: UsersService,
    private notificationService: NotificationService,
  ) {}
  async startAGameSession(
    data: CreateGameSessionDto,
    host: User,
  ): Promise<GameSession> {
    const hostGamer = this.createGamer(
      host.id,
      host.username,
      (host as any).profile?.avatar ?? '',
      '',
      true,
    );
    if (data.againstBot) {
      const participants = [
        hostGamer,
        this.createGamer(0, 'Bot', '', '', false),
      ];
      return this.createGameSession(participants, GameSessionType.Bot);
    } else if (!data.againstBot && data.opponent) {
      const opponent = await this.createOpponentGamer(false, data.opponent, '');
      const rules = data.rules ?? { maxScore: 5, maxTime: 300 };
      const session = await this.createGameSession(
        [hostGamer, opponent],
        GameSessionType.PrivateGame,
        rules,
      );
      // send notification to the opponent
      this.notificationService.createGameNotification(
        opponent.userId,
        session.gameId,
        `Tu as été defié par <a href="/users/show/${host.id}">${host.username}</a> pour une partie privée,
          max score: ${rules.maxScore} points.`,
      );
      return session;
    } else {
      const existingGameSession = this.findGameSessionByHostIdAndType(
        host.id,
        GameSessionType.QueListGame,
      );
      if (existingGameSession) {
        return existingGameSession;
      }
      return this.createGameSession([hostGamer], GameSessionType.QueListGame);
    }
  }

  async joinQueue(user: User): Promise<GameSession> {
    // check if user is already in a game session
    const userGameStatus = this.getUserGameStatus(user.id, user);
    if (userGameStatus.status === 'playing') {
      throw new UnauthorizedException('User is already playing');
    } else if (userGameStatus.status === 'inQueue') {
      return userGameStatus.gameSession;
    }
    const availableGameSession = this.findAvailableQueueGameSession();
    if (availableGameSession) {
      // Add the user to the game session and return it.
      availableGameSession.participants.push(
        this.createGamer(
          user.id,
          user.username,
          (user as any).profile?.avatar ?? '',
        ),
      );
      await this.gameService.addParticipant(
        availableGameSession.gameId,
        user.id,
      );
      this.notificationService.createHasJoinedGameNotification(
        availableGameSession.hostId,
        availableGameSession.gameId,
        `<a href="/users/show/${user.id}">${user.username}</a> a été ajouté à la partie`,
      );
      return availableGameSession;
    } else {
      return this.startAGameSession({ againstBot: false }, user);
    }
  }

  async addViewerToGameSession(
    gameId: number,
    user: Pick<User, 'id' | 'username'> & { clientId?: string },
  ) {
    const gameSession = this.gameSessions.get(gameId);
    if (!gameSession) {
      throw new Error('Game session not found');
    }
    const viewer = gameSession.observers.find((g) => g.userId === user.id);
    if (viewer) return gameSession;
    await this.gameService.addObserver(gameId, user.id).then((game) => {
      gameSession.observers.push({
        userId: user.id,
        username: user.username,
        clientId: user.clientId ?? '',
      });
    });
    return gameSession;
  }

  async acceptGameInvitation(gameId: number, user: User): Promise<GameSession> {
    const gameSession = this.gameSessions.get(gameId);
    if (!gameSession) {
      throw new Error('Game session not found');
    }

    // Check if the user is already a participant
    const isAlreadyParticipant = gameSession.participants.some(
      (participant) => participant.userId === user.id,
    );
    if (!isAlreadyParticipant) {
      const newParticipant = this.createGamer(
        user.id,
        user.username,
        (user as any).profile?.avatar ?? '',
        '',
        false,
      );
      gameSession.participants.push(newParticipant);
      this.updateGameSession(gameId, gameSession);
    }
    // Notify the host of the game session
    this.notificationService.createChallengeAcceptedNotification(
      gameSession.hostId,
      gameId,
      `${user.username} a accepter ton challenge, allons-y`,
    );
    return gameSession;
  }

  async refuseGameInvitation(gameId: number, user: User): Promise<void> {
    // Find the game session by gameId
    const gameSession = this.gameSessions.get(gameId);
    if (!gameSession) {
      throw new Error('Game session not found');
    }

    // Check if the user is already a participant
    const isAlreadyParticipant = gameSession.participants.some(
      (participant) => participant.userId === user.id,
    );
    if (isAlreadyParticipant) {
      const participantIndex = gameSession.participants.findIndex(
        (participant) => participant.userId === user.id,
      );
      gameSession.participants.splice(participantIndex, 1);
      this.updateGameSession(gameId, gameSession);
    }
    // Notify the host of the game session
    this.notificationService.createGameInviteRejectedNotification(
      gameSession.hostId,
      gameId,
      `L'invitation a été rejete par ${user.username}</a>`,
    );

    if (gameSession.participants.length === 1) {
      this.deleteGameSession(gameId);
    }
  }

  async getUserGameSessions(userId: number): Promise<GameSession[]> {
    const userGameSessions: GameSession[] = [];

    this.gameSessions.forEach((gameSession) => {
      const isParticipant = gameSession.participants.some(
        (participant) => participant.userId === userId,
      );
      if (isParticipant) {
        userGameSessions.push(gameSession);
      }
    });

    return userGameSessions;
  }

  getUserGameStatus(
    userId: number,
    checker: User,
  ): {
    status: 'playing' | 'inQueue' | 'free';
    gameSession?: GameSession;
  } {
    const toDelete = [];
    for (const gameSession of this.gameSessions.values()) {
      if (gameSession.state === GameMonitorState.Ended) {
        gameSession.gameEngine?.stopLoop();
        if (gameSession.hostId === checker.id) {
          toDelete.push(gameSession.gameId);
        }
        continue;
      }
      const participant = gameSession.participants.find(
        (p) => p.userId === userId,
      );
      if (participant) {
        const status = this.isPlaying(gameSession) ? 'playing' : 'inQueue';
        return { status, gameSession };
      }
    }
    for (const gameId of toDelete) {
      this.gameSessions.delete(gameId);
    }
    return { status: 'free' };
  }

  private isPlaying(gameSession: GameSession): boolean {
    if (
      gameSession.state === GameMonitorState.Play ||
      gameSession.state === GameMonitorState.Pause
    ) {
      return true;
    } else if (gameSession.state === GameMonitorState.Ready) {
      return true;
    }
    return false;
  }

  getUsersGameStatus(
    userIds: number[],
    checker: User,
  ): {
    status: 'playing' | 'inQueue' | 'free';
    gameSession?: GameSession;
  }[] {
    const statuses: {
      status: 'playing' | 'inQueue' | 'free';
      gameSession?: GameSession;
    }[] = [];
    for (const userId of userIds) {
      statuses.push(this.getUserGameStatus(userId, checker));
    }
    return statuses;
  }

  async deleteGameSessionByUser(gameId: number, userId: number): Promise<void> {
    const gameSession = this.gameSessions.get(gameId);
    if (!gameSession) {
      throw new NotFoundException("Game session doesn't exist");
    }
    if (gameSession.hostId !== userId) {
      throw new UnauthorizedException('User is not the host');
    }
    this.deleteGameSession(gameId);
  }

  async quitGameSession(gameId: number, userId: number): Promise<void> {
    const gameSession = this.gameSessions.get(gameId);
    if (!gameSession) {
      throw new NotFoundException('Game session not found');
    }
    const participantIndex = gameSession.participants.findIndex(
      (participant) => participant.userId === userId,
    );
    if (participantIndex === -1) {
      throw new UnauthorizedException('User is not a participant');
    }
    gameSession.participants.splice(participantIndex, 1);
    this.updateGameSession(gameId, gameSession);
  }

  getNumberOfGameSessions(): number {
    return this.gameSessions.size;
  }

  getNumberOfPlayerWaitingForAnOpponent(): number {
    let count = 0;
    for (const gameSession of this.gameSessions.values()) {
      if (
        gameSession.type === GameSessionType.QueListGame &&
        gameSession.participants.length === 1
      ) {
        count++;
      }
    }
    return count;
  }

  findAvailableQueueGameSession(): GameSession | undefined {
    for (const gameSession of this.gameSessions.values()) {
      if (
        gameSession.type === GameSessionType.QueListGame &&
        gameSession.participants.length === 1
      ) {
        return gameSession;
      }
    }
    return undefined;
  }

  findGameSessionByHostIdAndType(
    hostId: number,
    type: GameSessionType,
  ): GameSession | undefined {
    for (const gameSession of this.gameSessions.values()) {
      if (gameSession.hostId === hostId && gameSession.type === type) {
        return gameSession;
      }
    }
    return undefined;
  }

  getGameSessionByClientId(clientId: string): GameSession | undefined {
    for (const gameSession of this.gameSessions.values()) {
      const participant = gameSession.participants.find(
        (p) => p.clientId === clientId,
      );
      if (participant) {
        return gameSession;
      }
    }
    return undefined;
  }

  async createGameSession(
    participants: Gamer[],
    type: GameSessionType,
    rules: GameRules = { maxScore: 5, maxTime: 300 },
  ): Promise<GameSession> {
    const monitors = Array<GameMonitorState>(participants.length).fill(
      GameMonitorState.Waiting,
    );
    const participantsIds = participants
      .map((p) => p.userId)
      .filter((id) => id !== 0); // remove the bot id
    const game = await this.createAGame(participantsIds, type);
    // fill the score map with 0 for each participant
    const score = new Map<number, number>();
    participants.forEach((p) => {
      score.set(p.userId, 0);
    });
    const gameSession: GameSession = {
      gameId: game.id,
      hostId: participants[0].userId,
      type,
      participants: participants,
      observers: [],
      score,
      state: GameMonitorState.Waiting,
      monitors: monitors,
      eventsToPublishInRoom: [],
      rules,
    };
    this.gameSessions.set(game.id, gameSession);
    return gameSession;
  }

  async createAGame(
    participants: number[],
    type: GameSessionType,
    competitionId?: number,
  ): Promise<Game> {
    let name = 'Challenge Game';
    let description = 'Challenge Game';
    switch (type) {
      case GameSessionType.Bot:
        name = 'Bot Game';
        description = 'Bot Game';
        break;
      case GameSessionType.QueListGame:
        name = 'QueList Game';
        description = 'A game created by a player waiting for an opponent';
        break;
      case GameSessionType.PrivateGame:
      default:
        name = 'Challenge Game';
        description = 'A challenge game between two players';
        break;
    }
    return await this.gameService.createGame({
      name: name,
      description: description,
      participants: {
        createMany: {
          data: participants.map((id) => ({ userId: id })),
        },
      },
      competition: competitionId
        ? { connect: { id: competitionId } }
        : undefined,
    });
  }

  async createOpponentGamer(
    isBot: boolean,
    OpponentId?: number,
    clientId?: string,
  ): Promise<Gamer> {
    if (isBot) {
      return this.createGamer(0, 'Bot', '', '', false);
    }
    try {
      const opponent = await this.userRepository.getUser({
        id: OpponentId,
      });
      return this.createGamer(
        opponent.id,
        opponent.username,
        (opponent as any).profile?.avatar ?? '',
        clientId ?? '',
        false,
      );
    } catch (error) {
      throw error;
    }
  }

  createGamer(
    userId: number,
    username = '',
    avatar = '',
    clientId = '',
    isHost = false,
  ): Gamer {
    return {
      userId,
      username,
      clientId,
      avatar,
      isHost,
    };
  }

  getGameSession(gameId: number): GameSession | undefined {
    return this.gameSessions.get(gameId);
  }

  updateGameSession(
    gameId: number,
    updatedGameSession: Partial<GameSession>,
  ): void {
    const gameSession = this.gameSessions.get(gameId);
    if (gameSession) {
      this.gameSessions.set(gameId, { ...gameSession, ...updatedGameSession });
    }
  }

  cleanGameSessions(): void {
    const toDelete = [];
    for (const gameSession of this.gameSessions.values()) {
      if (gameSession.state === GameMonitorState.Ended) {
        gameSession.gameEngine?.stopLoop();
        toDelete.push(gameSession.gameId);
      }
    }
    for (const gameId of toDelete) {
      this.gameSessions.delete(gameId);
    }
  }

  deleteGameSession(gameId: number): void {
    const gameSession = this.gameSessions.get(gameId);
    if (!gameSession) {
      throw new NotFoundException("Game session doesn't exist");
    }
    gameSession.gameEngine?.stopLoop();
    this.gameSessions.delete(gameId);
  }

  writeGameHistory(
    event: GameEvent,
    userId: GameHistory[`userId`],
    gameId: number,
  ) {
    if (userId === 0) return;
    this.gameService.addHistoryToGame({
      event: event,
      user: {
        connect: {
          id: userId,
        },
      },
      game: {
        connect: {
          id: gameId,
        },
      },
    });
  }

  setTheWinner(gameSession: GameSession, winnerId: number) {
    if (winnerId === 0) return;
    this.gameService.updateGame({
      where: { id: gameSession.gameId },
      data: { winner: { connect: { id: winnerId } } },
    });
  }

  // return the statistics of the game sessions running on the server and the scores
  getGameSessionsStatistics(): {
    gameId: number;
    hostId: number;
    type: GameSessionType;
    scores: Array<{ userId: number; score: number }>;
  }[] {
    const statistics = [];
    for (const gameSession of this.gameSessions.values()) {
      statistics.push({
        gameId: gameSession.gameId,
        hostId: gameSession.hostId,
        type: gameSession.type,
        scores: Array.from(gameSession.score.entries()),
      });
    }
    return statistics;
  }
}
