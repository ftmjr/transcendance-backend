import { Injectable } from '@nestjs/common';
import {
  GameSession,
  GameSessionType,
  OnlineGameStates,
  GameMonitorState,
  Gamer,
} from './interfaces';
import { CreateGameSessionDto } from './dto';
import { Game, User } from '@prisma/client';
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
      const session = await this.createGameSession(
        [hostGamer, opponent],
        GameSessionType.PrivateGame,
      );
      // send notification to the opponent
      this.notificationService.createGameNotification(
        opponent.userId,
        session.gameId,
        `Tu as été defié par ${host.username} pour une partie privée`,
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
      this.notificationService.createChallengeAcceptedNotification(
        availableGameSession.hostId,
        availableGameSession.gameId,
        `${user.username} has accepted the game invitation`,
      );
      return availableGameSession;
    } else {
      return this.startAGameSession({ againstBot: false }, user);
    }
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
    this.notificationService.createGameNotification(
      gameSession.hostId,
      gameId,
      `The game invitation has been refused by ${user.username}`,
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
    for (const gameSession of this.gameSessions.values()) {
      const participant = gameSession.participants.find(
        (p) => p.userId === userId,
      );
      if (participant) {
        const status =
          gameSession.state === OnlineGameStates.PLAYING
            ? 'playing'
            : 'inQueue';
        return { status, gameSession };
      }
    }
    return { status: 'free' };
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
    if (!gameSession || gameSession.hostId !== userId) {
      throw new Error('Game session not found or user is not the host');
    }
    this.deleteGameSession(gameId);
  }

  async quitGameSession(gameId: number, userId: number): Promise<void> {
    const gameSession = this.gameSessions.get(gameId);
    if (!gameSession) {
      throw new Error('Game session not found');
    }
    const participantIndex = gameSession.participants.findIndex(
      (participant) => participant.userId === userId,
    );
    if (participantIndex === -1) {
      throw new Error('User is not a participant');
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
  ): Promise<GameSession> {
    const monitors = Array<GameMonitorState>(participants.length).fill(
      GameMonitorState.InitGame,
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
    // @TODO: in the future implement a way to create Sesssion for a competition
    const gameSession: GameSession = {
      gameId: game.id,
      hostId: participants[0].userId,
      type,
      participants: participants,
      observers: [],
      score,
      state: OnlineGameStates.WAITING,
      monitors: monitors,
      eventsToPublishInRoom: [],
      rules: {
        maxScore: 2, // default value
        maxTime: 300, // default value in seconds
      },
    };
    this.gameSessions.set(game.id, gameSession);
    return gameSession;
  }

  async createAGame(
    participants: number[],
    type: GameSessionType,
    competitionId?: number,
  ): Promise<Game> {
    const name = type === GameSessionType.Bot ? 'Bot Game' : 'Challenge Game';
    const description =
      type === GameSessionType.Bot ? 'Against AI' : 'Challenge Game';
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
      const opponent = await this.userRepository.getUserWithData({
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
      if (gameSession.state === OnlineGameStates.FINISHED) {
        toDelete.push(gameSession.gameId);
      }
    }
    for (const gameId of toDelete) {
      this.gameSessions.delete(gameId);
    }
  }

  deleteGameSession(gameId: number): void {
    this.gameSessions.delete(gameId);
  }
}
