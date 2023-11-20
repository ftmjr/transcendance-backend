// src/games/gameRealtime.service.ts
import { Injectable } from '@nestjs/common';
import { GameSessionService } from './game-session.service';
import {
  BallServedData,
  GAME_EVENTS,
  GameMonitorState,
  GameSession,
  GameSessionType,
  PadMovedData,
} from './interfaces';
import { GameEvent, GameHistory } from '@prisma/client';
import { JoinGameEvent } from './dto';
import GameEngine, { EngineState } from './engine';
import { GameGateway } from './game.gateway';

@Injectable()
export class GameRealtimeService {
  constructor(private gameSessionService: GameSessionService) {}

  clientPlayerConnected(
    gameId: number,
    userId: number,
    clientId: string,
    gameGateway: GameGateway,
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
    gameSession.eventsToPublishInRoom.push({
      event: GAME_EVENTS.GameMonitorStateChanged,
      data: {
        roomId: gameId,
        data: gameSession.state,
      },
    });
    const scores = this.arrayOfPlayersWithScore(gameSession);
    gameSession.eventsToPublishInRoom.push({
      event: GAME_EVENTS.ScoreChanged,
      data: {
        roomId: gameId,
        data: scores,
      },
    });
    this.createEngine(gameSession, gameGateway);
    return gameSession;
  }

  async clientViewerConnected(
    joinData: JoinGameEvent,
    clientId: string,
  ): Promise<GameSession> {
    const { roomId } = joinData;
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
        roomId,
        data: Array.from(gameSession.participants.values()),
      },
    });
    gameSession.eventsToPublishInRoom.push({
      event: GAME_EVENTS.ViewersRetrieved,
      data: {
        roomId,
        data: Array.from(gameSession.observers.values()),
      },
    });
    gameSession.eventsToPublishInRoom.push({
      event: GAME_EVENTS.GameMonitorStateChanged,
      data: {
        roomId,
        data: gameSession.state,
      },
    });
    const scores = this.arrayOfPlayersWithScore(gameSession);
    gameSession.eventsToPublishInRoom.push({
      event: GAME_EVENTS.ScoreChanged,
      data: {
        roomId: roomId,
        data: scores,
      },
    });
    return gameSession;
  }

  handleSocketDisconnection(clientId: string): GameSession[] {
    // find game session where client is a player
    this.gameSessionService.cleanGameSessions();
    const gameSessions: GameSession[] = [];
    const notEnded =
      this.gameSessionService.getNotEndedGameSessionsIdsByClient(clientId);
    for (const gameId of notEnded) {
      const gameSession = this.gameSessionService.getGameSession(gameId);
      if (!gameSession) continue;
      gameSessions.push(gameSession);
      gameSession.eventsToPublishInRoom.push({
        event: GAME_EVENTS.PlayerLeft,
        data: {
          roomId: gameId,
          data: gameSession.participants.find((p) => p.clientId === clientId),
        },
      });
      gameSession.eventsToPublishInRoom.push({
        event: GAME_EVENTS.GameStateChanged,
        data: {
          roomId: gameId,
          data: GameMonitorState.Ended,
        },
      });
      // pause the game if it is not already paused
      gameSession.gameEngine?.stopLoop();
      gameSession.state = GameMonitorState.Ended;
    }
    return gameSessions;
  }

  handleGameStateChanged(
    gameSession: GameSession,
    userId: number,
    newState: GameMonitorState,
  ) {
    if (gameSession.state === newState) return;
    // only players can change the state of the game
    const gamer = gameSession.participants.find((g) => g.userId === userId);
    if (!gamer) return;
    this.setGamerMonitorState(gameSession, userId, newState);
    switch (newState) {
      case GameMonitorState.Ready:
        if (
          this.checkAllMonitorsSameState(gameSession, GameMonitorState.Ready)
        ) {
          this.setAllMonitorsState(gameSession, GameMonitorState.Play);
          gameSession.eventsToPublishInRoom.push({
            event: GAME_EVENTS.GameMonitorStateChanged,
            data: {
              roomId: gameSession.gameId,
              data: GameMonitorState.Play,
            },
          });
          gameSession.state = GameMonitorState.Play;
        }
        break;
      case GameMonitorState.Pause:
        this.setAllMonitorsState(gameSession, GameMonitorState.Pause);
        gameSession.eventsToPublishInRoom.push({
          event: GAME_EVENTS.GameMonitorStateChanged,
          data: {
            roomId: gameSession.gameId,
            data: GameMonitorState.Pause,
          },
        });
        gameSession.state = GameMonitorState.Pause;
        gameSession.gameEngine?.pauseLoop();
        break;
      case GameMonitorState.Ended:
        this.handlePlayerLeftGameWithGrace(gameSession, userId);
        break;
    }
  }

  handlePlayerLeftGameWithGrace(gameSession: GameSession, userId: number) {
    gameSession.state = GameMonitorState.Ended;
    const gamer = gameSession.participants.find((g) => g.userId === userId);
    if (!gamer) return;
    this.writeGameHistory(GameEvent.PLAYER_LEFT, userId, gameSession.gameId);
    gameSession.eventsToPublishInRoom.push({
      event: GAME_EVENTS.PlayerLeft,
      data: {
        roomId: gameSession.gameId,
        data: gamer,
      },
    });
    gameSession.eventsToPublishInRoom.push({
      event: GAME_EVENTS.GameStateChanged,
      data: {
        roomId: gameSession.gameId,
        data: GameMonitorState.Ended,
      },
    });
    // remove the gamer from the game session
    gameSession.participants = gameSession.participants.filter(
      (g) => g.userId !== userId,
    );
    // if one player stays we set him as the winner and end the game
    if (gameSession.participants.length === 1) {
      this.handleGameEnding(gameSession, gameSession.participants[0].userId);
    }
  }

  handlePadMoved(gameSession: GameSession, data: PadMovedData) {
    if (!gameSession.gameEngine) return;
    const engineData = gameSession.gameEngine.paddleMove(
      data.userId,
      data.direction,
    );
    gameSession.eventsToPublishInRoom.push({
      event: GAME_EVENTS.PadMoved,
      data: {
        roomId: gameSession.gameId,
        data: engineData,
      },
    });
  }

  handleBallServed(gameSession: GameSession, data: BallServedData) {
    if (!gameSession.gameEngine) return;
    gameSession.gameEngine.serveBall(data.userId);
  }

  public onScoreRoutine(userId: number, gameId: number) {
    const gameSession = this.gameSessionService.getGameSession(gameId);
    if (!gameSession) return;
    const score = gameSession.score.get(userId) ?? 0;
    gameSession.score.set(userId, score + 1);
    if (userId !== 0)
      this.writeGameHistory(GameEvent.ACTION_PERFORMED, userId, gameId);
    else {
      this.writeGameHistory(
        GameEvent.IA_ACTION_PERFORMED,
        gameSession.hostId,
        gameId,
      );
    }
    const needToEnd = this.checkRulesToEndGame(gameSession);
    if (needToEnd.stop) {
      this.handleGameEnding(gameSession, needToEnd.winnerId);
      gameSession.gameEngine.pauseLoop();
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

  // called to end the game and set the winner and the looser
  handleGameEnding(gameSession: GameSession, winnerId: number) {
    gameSession.state = GameMonitorState.Ended;
    for (const user of gameSession.participants) {
      if (user.userId === 0) continue;
      if (user.userId === winnerId) {
        this.writeGameHistory(
          GameEvent.MATCH_WON,
          user.userId,
          gameSession.gameId,
        );
        // no await for non blocking
        this.gameSessionService.setTheWinner(gameSession, user.userId);
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

  private createEngine(gameSession: GameSession, gameGateway: GameGateway) {
    if (gameSession.gameEngine) {
      if (
        gameSession.gameEngine.state === EngineState.PAUSED &&
        gameSession.state === GameMonitorState.Play
      ) {
        gameSession.gameEngine.resumeLoop();
      }
      return;
    }
    // if we have to player we create it
    if (
      gameSession.participants.length === 2 &&
      gameSession.state !== GameMonitorState.Ended
    ) {
      gameSession.gameEngine = new GameEngine(
        gameSession.gameId,
        gameSession.participants,
        this,
        gameGateway,
        gameSession.score,
      );
      gameSession.gameEngine.activateLoop(); // 60 times per second
      return;
    }
  }

  writeGameHistory(
    event: GameEvent,
    userId: GameHistory[`userId`],
    gameId: number,
  ) {
    if (userId === 0) return;
    this.gameSessionService.writeGameHistory(event, userId, gameId);
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
    if (gameSession.type === GameSessionType.Bot) {
      this.setAllMonitorsState(gameSession, state);
      return;
    }
    const gamer = gameSession.participants.find((g) => g.userId === userId);
    if (!gamer) return;
    if (state === GameMonitorState.Ready) {
      this.writeGameHistory(GameEvent.GAME_STARTED, userId, gameSession.gameId);
    }
    const index = gameSession.participants.indexOf(gamer);
    gameSession.monitors[index] = state;
  }

  private setAllMonitorsState(
    gameSession: GameSession,
    state: GameMonitorState,
  ) {
    gameSession.monitors = gameSession.monitors.map(() => state);
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
    await this.gameSessionService.addViewerDataFromSocket(
      gameSession.gameId,
      data,
    );
  }
}
