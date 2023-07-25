import { Injectable } from '@nestjs/common';
import { GamesService } from '../games/games.service';
import { Game } from '@prisma/client';
import {
  Gamer,
  GameSession,
  GameUserType,
  OnlineGameStates,
  GAME_EVENTS,
} from './interfaces';
import { JoinGameEvent } from './dto';

@Injectable()
export class GameRealtimeService {
  currentManagedGames: GameSession[] = [];

  constructor(private gameService: GamesService) {}

  async handleJoiningAGame(data: JoinGameEvent): Promise<GameSession> {
    if (data.roomId === 0) {
      return this.handleJoiningAWaitingGame(data);
    }
    const gameSession = this.currentManagedGames.find(
      (g) => g.gameId === data.roomId,
    );
    if (!gameSession) {
      return await this.createAGameSession(
        new Map([[data.user.userId, data.user]]),
        new Map(),
        data.userType === GameUserType.Player
          ? OnlineGameStates.Waiting
          : OnlineGameStates.Playing_with_bot,
      );
    } else {
      // add player to existing game or return existing game if player is already in it
      return this.addPlayerToExistingGameSession(gameSession, data.user);
    }
  }

  async handleJoiningAWaitingGame(data: JoinGameEvent): Promise<GameSession> {
    const gameSession = this.currentManagedGames.find(
      (g) => g.state === OnlineGameStates.Waiting,
    );
    if (gameSession && data.userType === GameUserType.Player) {
      // add player to existing game or return existing game if player is already in it
      return await this.addPlayerToExistingGameSession(gameSession, data.user);
    }
    return await this.createAGameSession(
      new Map([[data.user.userId, data.user]]),
      new Map(),
      data.userType === GameUserType.Player
        ? OnlineGameStates.Waiting
        : OnlineGameStates.Playing_with_bot,
    );
  }

  async handleJoiningAsObserver(data: JoinGameEvent): Promise<GameSession> {
    const gameSession = this.currentManagedGames.find(
      (g) => g.gameId === data.roomId,
    );

    if (!gameSession) {
      throw new Error(`Game with id ${data.roomId} does not exist`);
    }

    if (!gameSession.observers.has(data.user.userId)) {
      await this.gameService.addObserver({
        gameId: gameSession.gameId,
        userId: data.user.userId,
      });

      gameSession.observers.set(data.user.userId, data.user);
      gameSession.events.push({
        event: GAME_EVENTS.ViewerAdded,
        data: { id: data.user.userId, data: data.user },
      });
    }

    return gameSession;
  }

  async addPlayerToExistingGameSession(
    gameSession: GameSession,
    user: Gamer,
  ): Promise<GameSession> {
    if (
      gameSession.participants.has(user.userId) ||
      gameSession.observers.has(user.userId)
    ) {
      return gameSession;
    }
    if (gameSession.state === OnlineGameStates.Waiting) {
      return await this.addPlayerToGameSession(gameSession, user);
    }
  }

  async addPlayerToGameSession(
    gameSession: GameSession,
    user: Gamer,
  ): Promise<GameSession> {
    await this.gameService.addParticipant({
      gameId: gameSession.gameId,
      userId: user.userId,
    });
    gameSession.participants.set(user.userId, user);
    gameSession.events.push({
      event: GAME_EVENTS.PlayerAdded,
      data: { id: user.userId, data: user },
    });
    if (gameSession.participants.size === 2) {
      gameSession.state = OnlineGameStates.Playing;
    }
    return gameSession;
  }

  async createAGameSession(
    participants: Map<number, Gamer>,
    observers: Map<number, Gamer>,
    state: OnlineGameStates,
  ): Promise<GameSession> {
    const game = await this.createAGame(participants, observers);
    const gameSession: GameSession = {
      gameId: game.id,
      participants,
      observers,
      state,
      events: [
        {
          event: GAME_EVENTS.PlayersRetrieved,
          data: { id: game.id, data: Array.from(participants.values()) },
        },
        {
          event: GAME_EVENTS.ViewersRetrieved,
          data: { id: game.id, data: Array.from(observers.values()) },
        },
      ],
    };
    this.currentManagedGames.push(gameSession);
    return gameSession;
  }

  async createAGame(
    participants: Map<number, Gamer>,
    observers: Map<number, Gamer>,
  ): Promise<Game> {
    const participantsData = Array.from(participants.values());
    const observersData = Array.from(observers.values());
    return await this.gameService.create({
      name: '',
      description: '',
      participants: participantsData.length
        ? {
            createMany: {
              data: participantsData.map((user) => ({ userId: user.userId })),
            },
          }
        : undefined,
      observers: observersData.length
        ? {
            createMany: {
              data: observersData.map((user) => ({ userId: user.userId })),
            },
          }
        : undefined,
    });
  }
}
