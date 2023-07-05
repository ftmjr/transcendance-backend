import { Injectable } from '@nestjs/common';
import { GamesService } from '../games/games.service';
import { Game, GameHistory } from '@prisma/client';
import { GameSession, OnlineGameStates } from './interfaces';

@Injectable()
export class GameRealtimeService {
  currentManagedGames: GameSession[] = [];

  constructor(private gameService: GamesService) {}

  async addPlayerInWaitingRoom(userId: number): Promise<Game> {
    const waitingGame = this.currentManagedGames.find(
      (g) => g.state === OnlineGameStates.Waiting,
    );
    if (waitingGame) {
      return this.addPlayerToGame(waitingGame.gameId, userId);
    } else {
      return this.createAGame(userId);
    }
  }

  async createAGame(userId: number): Promise<Game> {
    const game = await this.gameService.create({
      description: 'Online game',
      name: 'Random game',
      participants: {
        create: {
          userId,
        },
      },
    });

    this.currentManagedGames.push({
      gameId: game.id,
      participantIds: [userId],
      observerIds: [],
      state: OnlineGameStates.Waiting,
    });

    return game;
  }

  async addPlayerToGame(gameId: number, userId: number): Promise<Game> {
    const game = await this.gameService.addParticipant({
      gameId,
      userId,
    });

    const gameSession = this.currentManagedGames.find(
      (g) => g.gameId === gameId,
    );
    if (gameSession) {
      gameSession.participantIds.push(userId);
      if (gameSession.participantIds.length === 2) {
        gameSession.state = OnlineGameStates.Playing;
      }
    }

    return game;
  }

  async addObserverToGame(gameId: number, userId: number): Promise<Game> {
    const game = await this.gameService.addObserver({
      gameId,
      userId,
    });

    const gameSession = this.currentManagedGames.find(
      (g) => g.gameId === gameId,
    );
    if (gameSession) {
      gameSession.observerIds.push(userId);
    }
    return game;
  }

  checkIfWaitingForOpponent(): boolean {
    return this.currentManagedGames.some(
      (g) => g.state === OnlineGameStates.Waiting,
    );
  }

  getGameSession(gameId: number): GameSession | undefined {
    return this.currentManagedGames.find((g) => g.gameId === gameId);
  }

  getGameFromSession(gameSession: GameSession): Promise<Game> {
    return this.gameService.findOne(gameSession.gameId);
  }

  addGameHistory(
    event: GameHistory[`event`],
    gameId: number,
    userId,
  ): Promise<GameHistory> {
    return this.gameService.addHistory({
      event,
      gameId,
      userId,
    });
  }

  endGameSession(gameId: number): void {
    const gameSession = this.currentManagedGames.find(
      (g) => g.gameId === gameId,
    );
    if (gameSession) {
      gameSession.state = OnlineGameStates.Finished;
    }
  }
}
