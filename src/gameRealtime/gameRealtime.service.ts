import { Injectable } from '@nestjs/common';
import { GamesService, Game } from '../games/games.service';
import { GameEvent, GameHistory } from '@prisma/client';
import {
  GAME_EVENTS,
  GameMonitorState,
  Gamer,
  GameSession,
  GameUserType,
  JoinGameData,
  OnlineGameStates,
} from './interfaces';
import { GameUser } from './dto';
import { GAME_STATE } from './interfaces/gameActions.interface';

@Injectable()
export class GameRealtimeService {
  currentManagedGames: GameSession[] = [];

  constructor(private gameService: GamesService) {}

  async handleJoiningAGame(data: JoinGameData): Promise<GameSession> {
    if (data.roomId === 0) {
      return this.handleJoiningAWaitingGame(data);
    }
    if (data.roomId === 9999) {
      return this.handleJoiningInviteGame(data);
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

  async handleJoiningAWaitingGame(data: JoinGameData): Promise<GameSession> {
    const gameSession = this.currentManagedGames.find(
      (g) => g.state === OnlineGameStates.Waiting,
    );
    if (gameSession && data.userType === GameUserType.Player) {
      // add player to existing game or return existing game if player is already in it
      return await this.addPlayerToExistingGameSession(gameSession, data.user);
    }
    return await this.createAGameSession(
      new Map([[data.user.userId, { ...data.user, isHost: true }]]),
      new Map(),
      data.userType === GameUserType.Player
        ? OnlineGameStates.Waiting
        : OnlineGameStates.Playing_with_bot,
    );
  }

  async handleJoiningInviteGame(data: JoinGameData): Promise<GameSession> {
    const gameSession = this.currentManagedGames.find(
      (g) => g.state === OnlineGameStates.Invite,
    );
    if (gameSession && data.userType === GameUserType.Player) {
      // add player to existing game or return existing game if player is already in it
      return await this.addPlayerToInviteGameSession(gameSession, data.user);
    }
    return await this.createAGameSession(
      new Map([[data.user.userId, { ...data.user, isHost: true }]]),
      new Map(),
      OnlineGameStates.Invite,
    );
  }

  async handleJoiningAsObserver(data: JoinGameData): Promise<GameSession> {
    const gameSession = this.currentManagedGames.find(
      (g) => g.gameId === data.roomId,
    );

    if (!gameSession) {
      throw new Error(`Game with id ${data.roomId} does not exist`);
    }

    if (!gameSession.observers.has(data.user.userId)) {
      await this.gameService.addObserver(gameSession.gameId, data.user.userId);
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

  async addPlayerToInviteGameSession(
    gameSession: GameSession,
    user: Gamer,
  ): Promise<GameSession> {
    if (
      gameSession.participants.has(user.userId) ||
      gameSession.observers.has(user.userId)
    ) {
      return gameSession;
    }
    if (gameSession.state === OnlineGameStates.Invite) {
      return await this.addPlayerToGameSession(gameSession, user);
    }
  }

  async addPlayerToGameSession(
    gameSession: GameSession,
    user: Gamer,
  ): Promise<GameSession> {
    await this.gameService.addParticipant(gameSession.gameId, user.userId);
    gameSession.participants.set(user.userId, {
      ...user,
      isHost: false,
    });
    await this.writeGameHistory(
      GameEvent.PLAYER_JOINED,
      user.userId,
      gameSession.gameId,
    );
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
    competitionId?: number,
  ): Promise<GameSession> {
    const monitors = Array<GameMonitorState>(participants.size).fill(
      GameMonitorState.Waiting,
    );
    if (state === OnlineGameStates.Playing_with_bot) {
      monitors[0] = GameMonitorState.Ready;
    }
    const game = await this.createAGame(participants, observers, competitionId);
    const rules = await this.getGameRules(game);
    const score = new Map<number, number>();
    participants.forEach((p) => {
      score.set(p.userId, 0);
      this.writeGameHistory(GameEvent.PLAYER_JOINED, p.userId, game.id);
    });
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
      rules,
    };
    this.currentManagedGames.push(gameSession);
    return gameSession;
  }

  async createAGame(
    participants: Map<number, Gamer>,
    observers: Map<number, Gamer>,
    competitionId?: number,
  ): Promise<Game> {
    const participantsData = Array.from(participants.values());
    const observersData = Array.from(observers.values());
    return await this.gameService.createGame({
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
      competition: competitionId
        ? {
            connect: {
              id: competitionId,
            },
          }
        : undefined,
    });
  }

  async getGameRules(
    game: Game,
  ): Promise<{ maxScore: number; maxTime: number }> {
    if (game.competition) {
      // const maxScore = game.competition.rules.maxScore ?? 5;
      // const maxTime = game.competition.rules.maxTime ?? 1000;
      // return {
      //   maxScore,
      //   maxTime,
      // };
    } else {
      return {
        maxScore: 2,
        maxTime: 1000,
      };
    }
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

  async syncGameEventToStart(gameSession: GameSession) {
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
    if (
      gameSession.monitors.every(
        (m) => m === GameMonitorState.PlayingSceneLoaded,
      )
    ) {
      gameSession.events.push({
        event: GAME_EVENTS.GameMonitorStateChanged,
        data: {
          id: gameSession.gameId,
          data: GameMonitorState.PlayingSceneLoaded,
        },
      });
      for (const userId of gameSession.participants.keys()) {
        await this.writeGameHistory(
          GameEvent.GAME_STARTED,
          userId,
          gameSession.gameId,
        );
      }
    }
  }

  async handleScoreUpdate(
    state: GAME_STATE,
    user: GameUser,
    gameSession: GameSession,
    isBot = false,
  ) {
    if (state !== GAME_STATE.scored) return;
    if (isBot) {
      gameSession.score.set(0, gameSession.score.get(0) + 1);
    } else {
      const score = gameSession.score.get(user.userId) ?? 0;
      gameSession.score.set(user.userId, score + 1);
      await this.writeGameHistory(
        GameEvent.ACTION_PERFORMED,
        user.userId,
        gameSession.gameId,
      );
    }
    const data = {
      id: gameSession.gameId,
      data: Array.from(gameSession.score.entries()).map(([userId, score]) => ({
        userId,
        score,
      })),
    };
    gameSession.events.push({
      event: GAME_EVENTS.ScoreChanged,
      data,
    });
    const rule = this.checkCompetitionRules(gameSession);
    if (rule.needToFinish) {
      await this.gameEnded(gameSession, rule);
    }
  }

  checkCompetitionRules(gameSession: GameSession) {
    let needToFinish = false;
    let winnerId = 0;
    if (gameSession.rules.maxScore > 0) {
      let maxScored = 0;
      gameSession.score.forEach((score, userId) => {
        if (score >= gameSession.rules.maxScore) {
          needToFinish = true;
        }
        if (score > maxScored) {
          maxScored = score;
          winnerId = userId;
        }
      });
    }
    return { needToFinish, winnerId };
  }

  async gameEnded(
    gameSession: GameSession,
    gameRule?: { needToFinish: boolean; winnerId: number },
  ) {
    gameSession.events.push({
      event: GAME_EVENTS.GameMonitorStateChanged,
      data: {
        id: gameSession.gameId,
        data: GameMonitorState.Ended,
      },
    });
    for (const userId of gameSession.participants.keys()) {
      if (gameRule) {
        if (userId === gameRule.winnerId) {
          await this.writeGameHistory(
            GameEvent.MATCH_WON,
            userId,
            gameSession.gameId,
          );
        } else {
          await this.writeGameHistory(
            GameEvent.MATCH_LOST,
            userId,
            gameSession.gameId,
          );
        }
      }
      await this.writeGameHistory(
        GameEvent.GAME_ENDED,
        userId,
        gameSession.gameId,
      );
    }
    gameSession.toBeDeleted = true;
  }

  async handleDisconnect(clientId: string) {
    const index = this.currentManagedGames.findIndex((g) => {
      const participants = Array.from(g.participants.values());
      return participants.findIndex((p) => p.clientId === clientId) > -1;
    });
    if (index === -1) throw new Error('Game session not found');
    const gameSession = this.currentManagedGames[index];
    for (const [userId, gamer] of gameSession.participants.entries()) {
      if (gamer.clientId === clientId) {
        await this.writeGameHistory(
          GameEvent.PLAYER_LEFT,
          userId,
          gameSession.gameId,
        );
        await this.writeGameHistory(
          GameEvent.GAME_ENDED,
          userId,
          gameSession.gameId,
        );
      }
    }
    gameSession.events.push({
      event: GAME_EVENTS.GameMonitorStateChanged,
      data: {
        id: gameSession.gameId,
        data: GameMonitorState.Ended,
      },
    });
    return gameSession;
  }

  async writeGameHistory(
    event: GameEvent,
    userId: GameHistory[`userId`],
    gameId: number,
  ) {
    try {
      await this.gameService.addHistoryToGame({
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
    } catch (e) {
      console.log('error writing game history');
    }
  }
}
