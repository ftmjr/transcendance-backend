import { Injectable } from '@nestjs/common';
import { GameSessionService } from './game-session.service';
import {
  GAME_EVENTS,
  GAME_STATE,
  GameMonitorState,
  GameSession,
  OnlineGameStates,
} from './interfaces';
import { GameEvent, GameHistory } from '@prisma/client';
import { GamesService } from './games.service';
import { JoinGameEvent } from './dto';

@Injectable()
export class GameRealtimeService {
  constructor(
    private gameSessionService: GameSessionService,
    private gamesService: GamesService,
  ) {}

  clientPlayerConnected(
    gameId: number,
    userId: number,
    clientId: string,
  ): GameSession {
    const gameSession = this.gameSessionService.getGameSession(gameId);
    if (!gameSession) {
      throw new Error(`Game session with id ${gameId} not found`);
    }
    const gamer = gameSession.participants.find((g) => g.userId === userId);
    if (gamer) {
      gamer.clientId = clientId;
    }
    gameSession.eventsToPublishInRoom.push({
      event: GAME_EVENTS.HostChanged,
      data: { roomId: gameId, data: gameSession.hostId },
    });
    gameSession.eventsToPublishInRoom.push({
      event: GAME_EVENTS.PlayersRetrieved,
      data: {
        roomId: gameId,
        data: Array.from(gameSession.participants.values()),
      },
    });
    gameSession.eventsToPublishInRoom.push({
      event: GAME_EVENTS.ViewersRetrieved,
      data: {
        roomId: gameId,
        data: Array.from(gameSession.observers.values()),
      },
    });
    this.writeGameHistory(GameEvent.GAME_STARTED, userId, gameId);
    return gameSession;
  }

  async clientViewerConnected(
    joinData: JoinGameEvent,
    clientId: string,
  ): Promise<GameSession> {
    const { roomId, user } = joinData;
    const gameSession = this.gameSessionService.getGameSession(roomId);
    if (!gameSession) {
      throw new Error(`Game session with id ${roomId} not found`);
    }
    await this.addViewerToGameSession(gameSession, {
      ...joinData.user,
      clientId,
    });
    gameSession.eventsToPublishInRoom.push({
      event: GAME_EVENTS.HostChanged,
      data: { roomId: roomId, data: gameSession.hostId },
    });
    gameSession.eventsToPublishInRoom.push({
      event: GAME_EVENTS.PlayersRetrieved,
      data: {
        roomId: roomId,
        data: Array.from(gameSession.participants.values()),
      },
    });
    gameSession.eventsToPublishInRoom.push({
      event: GAME_EVENTS.ViewersRetrieved,
      data: {
        roomId: roomId,
        data: Array.from(gameSession.observers.values()),
      },
    });
    return gameSession;
  }

  handleDisconnect(clientId: string) {
    // find game session where client is a player
    const gameSession =
      this.gameSessionService.getGameSessionByClientId(clientId);
    if (!gameSession)
      throw 'Game session not found, for this client in players';
    const gamer = gameSession.participants.find((g) => g.clientId === clientId);
    this.writeGameHistory(
      GameEvent.PLAYER_LEFT,
      gamer.userId,
      gameSession.gameId,
    );
    gameSession.eventsToPublishInRoom.push({
      event: GAME_EVENTS.GameMonitorStateChanged,
      data: {
        roomId: gameSession.gameId,
        data: GameMonitorState.Ended,
      },
    });
    gameSession.state = OnlineGameStates.FINISHED;
    return gameSession;
  }

  SyncMonitorsStates(
    state: GAME_STATE,
    userId: number,
    gameSession: GameSession,
  ) {
    // we need to move each player monitor to InitGame state
    if (state === GAME_STATE.waiting) {
      // update monitor states to ready depending on userId index
      this.setGamerMonitorState(gameSession, userId, GameMonitorState.InitGame);
      // update directly for Ai player if any
      this.setGamerMonitorState(gameSession, 0, GameMonitorState.InitGame);
    } else if (state === GAME_STATE.playing) {
      // update monitor states to playing depending on userId index
      this.setGamerMonitorState(
        gameSession,
        userId,
        GameMonitorState.PlayingSceneLoaded,
      );
      // update directly for Ai player if any
      this.setGamerMonitorState(
        gameSession,
        0,
        GameMonitorState.PlayingSceneLoaded,
      );
    }
    if (
      this.checkAllMonitorsSameState(gameSession, GameMonitorState.InitGame)
    ) {
      gameSession.eventsToPublishInRoom.push({
        event: GAME_EVENTS.GameMonitorStateChanged,
        data: { roomId: gameSession.gameId, data: GameMonitorState.InitGame },
      });
    } else if (
      this.checkAllMonitorsSameState(
        gameSession,
        GameMonitorState.PlayingSceneLoaded,
      )
    ) {
      this.gameSessionService.updateGameSession(gameSession.gameId, {
        state: OnlineGameStates.PLAYING,
      });
      gameSession.eventsToPublishInRoom.push({
        event: GAME_EVENTS.GameMonitorStateChanged,
        data: {
          roomId: gameSession.gameId,
          data: GameMonitorState.PlayingSceneLoaded,
        },
      });
    }
  }

  handleScoreUpdate(userId: number, gameSession: GameSession, isBot = false) {
    if (isBot) {
      gameSession.score.set(0, gameSession.score.get(0) + 1);
    } else {
      const score = gameSession.score.get(userId) ?? 0;
      gameSession.score.set(userId, score + 1);
      this.writeGameHistory(
        GameEvent.ACTION_PERFORMED,
        userId,
        gameSession.gameId,
      );
    }
    const data = {
      roomId: gameSession.gameId,
      data: this.arrayOfPlayersWithScore(gameSession),
    };
    gameSession.eventsToPublishInRoom.push({
      event: GAME_EVENTS.ScoreChanged,
      data,
    });
    const needToEnd = this.checkRulesToEndGame(gameSession);
    if (needToEnd.stop) {
      this.handleGameEnding(gameSession, needToEnd.winnerId);
    }
  }

  checkRulesToEndGame(gameSession: GameSession): {
    winnerId: number | null;
    stop: boolean;
  } {
    const scores = this.arrayOfPlayersWithScore(gameSession);
    const maxScore = Math.max(...scores.map((s) => s.score));
    const winner = scores.find((s) => s.score === maxScore);
    if (winner && maxScore >= gameSession.rules.maxScore) {
      return { winnerId: winner.userId, stop: true };
    }
    if (gameSession.rules.maxTime > 0) {
      // no rule yet for limit times
    }
    return { winnerId: null, stop: false };
  }

  handleGameEnding(gameSession: GameSession, winnerId: number) {
    gameSession.eventsToPublishInRoom.push({
      event: GAME_EVENTS.GameMonitorStateChanged,
      data: {
        roomId: gameSession.gameId,
        data: GameMonitorState.Ended,
      },
    });
    gameSession.state = OnlineGameStates.FINISHED;
    for (const user of gameSession.participants) {
      if (user.userId === 0) continue;
      if (user.userId === winnerId) {
        this.writeGameHistory(
          GameEvent.MATCH_WON,
          user.userId,
          gameSession.gameId,
        );
        // no await for non blocking
        this.gamesService.updateGame({
          where: { id: gameSession.gameId },
          data: { winner: { connect: { id: user.userId } } },
        });
      } else {
        this.writeGameHistory(
          GameEvent.MATCH_LOST,
          user.userId,
          gameSession.gameId,
        );
      }
      this.writeGameHistory(
        GameEvent.GAME_ENDED,
        user.userId,
        gameSession.gameId,
      );
    }
  }

  writeGameHistory(
    event: GameEvent,
    userId: GameHistory[`userId`],
    gameId: number,
  ) {
    if (userId === 0) return;
    this.gamesService.addHistoryToGame({
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

  reloadPlayersList(gameSession: GameSession) {
    gameSession.eventsToPublishInRoom.push({
      event: GAME_EVENTS.PlayersRetrieved,
      data: {
        roomId: gameSession.gameId,
        data: Array.from(gameSession.participants.values()),
      },
    });
  }

  reloadViewersList(gameSession: GameSession) {
    gameSession.eventsToPublishInRoom.push({
      event: GAME_EVENTS.ViewersRetrieved,
      data: {
        roomId: gameSession.gameId,
        data: Array.from(gameSession.observers.values()),
      },
    });
  }

  private setGamerMonitorState(
    gameSession: GameSession,
    userId: number,
    state: GameMonitorState,
  ) {
    const gamer = gameSession.participants.find((g) => g.userId === userId);
    if (!gamer) return;
    const index = gameSession.participants.indexOf(gamer);
    gameSession.monitors[index] = state;
  }

  private checkAllMonitorsSameState(
    gameSession: GameSession,
    state: GameMonitorState,
  ) {
    return gameSession.monitors.every((m) => m === state);
  }

  private arrayOfPlayersWithScore(
    gameSession: GameSession,
  ): { userId: number; score: number }[] {
    return Array.from(gameSession.score.entries()).map(([userId, score]) => ({
      userId,
      score,
    }));
  }

  private async addViewerToGameSession(
    gameSession: GameSession,
    data: { userId: number; username: string; clientId: string },
  ) {
    const { userId, username, clientId } = data;
    const viewer = gameSession.observers.find((g) => g.userId === userId);
    if (viewer) {
      viewer.clientId = clientId;
      return;
    }
    const gameId = gameSession.gameId;
    await this.gamesService.addObserver(gameId, userId).then((game) => {
      gameSession.observers.push({
        userId,
        username,
        clientId,
      });
    });
  }
}
