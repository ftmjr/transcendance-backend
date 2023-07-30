import { Injectable } from '@nestjs/common';
import { GamesService } from '../games/games.service';
import { Game } from '@prisma/client';
import {
  GAME_EVENTS,
  GameMonitorState,
  Gamer,
  GameSession,
  GameUserType,
  OnlineGameStates,
} from './interfaces';
import { GameUser, JoinGameEvent } from './dto';
import { GAME_STATE } from './interfaces/gameActions.interface';

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
    gameSession.score.set(user.userId, 0);
    gameSession.events.push({
      event: GAME_EVENTS.PlayerAdded,
      data: { id: user.userId, data: user },
    });
    if (gameSession.participants.size > gameSession.monitors.length) {
      gameSession.monitors.push(GameMonitorState.Waiting);
    }
    if (gameSession.participants.size === 2) {
      gameSession.state = OnlineGameStates.Playing;
      gameSession.events.push({
        event: GAME_EVENTS.PlayersRetrieved,
        data: {
          id: user.userId,
          data: Array.from(gameSession.participants.values()),
        },
      });
      gameSession.monitors = Array<GameMonitorState>(2).fill(
        GameMonitorState.Ready,
      );
    }
    return gameSession;
  }

  async createAGameSession(
    participants: Map<number, Gamer>,
    observers: Map<number, Gamer>,
    state: OnlineGameStates,
  ): Promise<GameSession> {
    const monitors = Array<GameMonitorState>(participants.size).fill(
      GameMonitorState.Waiting,
    );
    if (state === OnlineGameStates.Playing_with_bot) {
      monitors[0] = GameMonitorState.Ready;
    }
    const game = await this.createAGame(participants, observers);
    const score = new Map<number, number>();
    participants.forEach((p) => score.set(p.userId, 0));
    const gameSession: GameSession = {
      gameId: game.id,
      participants,
      hostId: participants.keys().next().value, // first participant is the host
      score,
      observers,
      state,
      monitors,
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

  // starting game event syncronization
  handleGameStart(state: GAME_STATE, user: GameUser, gameSession: GameSession) {
    // we need to move each player monitor to InitGame state
    if (state === GAME_STATE.waiting) {
      // update monitor states to ready depending on userId index
      const userIds = Array.from(gameSession.participants.keys());
      const userIndex = userIds.indexOf(user.userId);
      gameSession.monitors[userIndex] = GameMonitorState.InitGame;
      this.syncGameEventToStart(gameSession);
    }
    if (state === GAME_STATE.playing) {
      const userIds = Array.from(gameSession.participants.keys());
      const userIndex = userIds.indexOf(user.userId);
      gameSession.monitors[userIndex] = GameMonitorState.PlayingSceneLoaded;
      this.syncGameEventToStart(gameSession);
    }
  }

  syncGameEventToStart(gameSession: GameSession) {
    if (gameSession.monitors.every((m) => m === GameMonitorState.InitGame)) {
      if (gameSession.state === OnlineGameStates.Playing_with_bot) {
        // 0 as userId for bot
        gameSession.score.set(0, 0);
      }
      // message will set all of them to InitGame state
      gameSession.events.push({
        event: GAME_EVENTS.GameMonitorStateChanged,
        data: { id: gameSession.gameId, data: GameMonitorState.InitGame },
      });
      gameSession.events.push({
        event: GAME_EVENTS.HostChanged,
        data: { id: gameSession.gameId, data: gameSession.hostId },
      });
    }
    // if all monitors are in PlayingSceneLoaded state, we can start the game
    if (
      gameSession.monitors.every(
        (m) => m === GameMonitorState.PlayingSceneLoaded,
      )
    ) {
      // message will set all of them to PlayingSceneLoaded state
      gameSession.events.push({
        event: GAME_EVENTS.GameMonitorStateChanged,
        data: {
          id: gameSession.gameId,
          data: GameMonitorState.PlayingSceneLoaded,
        },
      });
    }
  }
  handleScoreUpdate(
    state: GAME_STATE,
    user: GameUser,
    gameSession: GameSession,
    isBot = false,
  ) {
    if (state !== GAME_STATE.scored) {
      return;
    }
    if (isBot) {
      gameSession.score.set(0, gameSession.score.get(0) + 1);
    } else {
      const userId = user.userId;
      const score = gameSession.score.get(userId);
      gameSession.score.set(userId, score + 1);
    }
    const data = {
      id: gameSession.gameId,
      data: Array.from(gameSession.score.keys()).map((id) => ({
        userId: id,
        score: gameSession.score.get(id),
      })),
    };
    gameSession.events.push({
      event: GAME_EVENTS.ScoreChanged,
      data,
    });
  }
}
