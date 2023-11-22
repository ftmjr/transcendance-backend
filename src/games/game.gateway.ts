// src/games/game.gateway.ts
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameRealtimeService } from './gameRealtime.service';
import {
  BallServedData,
  GAME_EVENTS,
  GameMonitorState,
  GameSession,
  GameUserType,
  PadMovedData,
} from './interfaces';
import { GameUser, JoinGameEvent } from './dto';
import { GameSessionService } from './game-session.service';
import { GameStateDataPacket } from './engine';

@WebSocketGateway({ namespace: 'game' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private gameRealtimeService: GameRealtimeService,
    private gameSessionService: GameSessionService,
  ) {}

  handleConnection(client: Socket, ...args: any[]) {
    // empty to avoid logging too much
  }

  handleDisconnect(@ConnectedSocket() client: Socket): any {
    try {
      const gameSessions = this.gameRealtimeService.handleSocketDisconnection(
        client.id,
      );
      if (!gameSessions) return;
      for (const gameSession of gameSessions) {
        this.handleGameEvents(gameSession);
      }
    } catch (e) {
      console.log(e);
    }
  }

  @SubscribeMessage(GAME_EVENTS.JoinGame)
  async handleJoinGame(
    @MessageBody() joinData: JoinGameEvent,
    @ConnectedSocket() client: Socket,
  ): Promise<{ worked: boolean; roomId: number }> {
    if (joinData.userType === GameUserType.Player) {
      const gameSession = this.gameRealtimeService.clientPlayerConnected(
        joinData.roomId,
        joinData.user.userId,
        client.id,
        this,
      );
      const roomName = `${joinData.roomId}`;
      const rooms = Object.keys(client.rooms);
      if (!rooms.includes(roomName)) {
        client.join(roomName);
      }
      this.handleGameEvents(gameSession);
      return {
        worked: true,
        roomId: gameSession.gameId,
      };
    } else {
      const gameSession = await this.gameRealtimeService.clientViewerConnected(
        joinData,
        client.id,
      );
      const roomName = `${joinData.roomId}`;
      const rooms = Object.keys(client.rooms);
      if (!rooms.includes(roomName)) {
        client.join(roomName);
      }
      await client.join(roomName);
      this.handleGameEvents(gameSession);
      return {
        worked: true,
        roomId: gameSession.gameId,
      };
    }
  }

  @SubscribeMessage(GAME_EVENTS.reloadPlayersList)
  async handleReloadPlayersList(
    @ConnectedSocket() client: Socket,
    @MessageBody() received: { roomId: number },
  ) {
    const { roomId } = received;
    const gameSession = this.gameSessionService.getGameSession(roomId);
    if (!gameSession) return;
    this.gameRealtimeService.reloadPlayersList(gameSession);
    this.handleGameEvents(gameSession);
  }

  @SubscribeMessage(GAME_EVENTS.reloadViewersList)
  async handleReloadViewersList(
    @ConnectedSocket() client: Socket,
    @MessageBody() received: { roomId: number },
  ) {
    const { roomId } = received;
    const gameSession = this.gameSessionService.getGameSession(roomId);
    if (!gameSession) return;
    this.gameRealtimeService.reloadViewersList(gameSession);
    this.handleGameEvents(gameSession);
  }

  @SubscribeMessage(GAME_EVENTS.GameStateChanged)
  async handleGameStateChanged(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    received: {
      roomId: number;
      user: GameUser;
      gameState: GameMonitorState;
    },
  ) {
    const { roomId, gameState, user } = received;
    const gameSession = this.gameSessionService.getGameSession(roomId);
    if (!gameSession) return;
    this.gameRealtimeService.handleGameStateChanged(
      gameSession,
      user.userId,
      gameState,
    );
    this.handleGameEvents(gameSession);
  }

  @SubscribeMessage(GAME_EVENTS.PadMoved)
  async handlePadMoved(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    received: {
      roomId: number;
      data: PadMovedData;
    },
  ) {
    const { roomId, data } = received;
    const gameSession = this.gameSessionService.getGameSession(roomId);
    if (!gameSession) return;
    this.gameRealtimeService.handlePadMoved(gameSession, data);
    this.handleGameEvents(gameSession);
  }

  @SubscribeMessage(GAME_EVENTS.BallServed)
  async handleBallServed(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    received: {
      roomId: number;
      data: BallServedData;
    },
  ) {
    const { roomId, data } = received;
    const gameSession = this.gameSessionService.getGameSession(roomId);
    if (!gameSession) return;
    this.gameRealtimeService.handleBallServed(gameSession, data);
    this.handleGameEvents(gameSession);
  }

  private handleGameEvents(gameSession: GameSession) {
    if (!gameSession) return;
    const roomName = `${gameSession.gameId}`;
    gameSession.eventsToPublishInRoom.forEach((eventObj) => {
      const { event, data } = eventObj;
      this.server.to(roomName).emit(event, data);
    });
    if (gameSession.state === GameMonitorState.Ended) {
      this.server
        .to(roomName)
        .emit(GAME_EVENTS.GameStateChanged, GameMonitorState.Ended);
    }
    gameSession.eventsToPublishInRoom.splice(
      0,
      gameSession.eventsToPublishInRoom.length,
    );
  }

  public sendGameObjectState(data: GameStateDataPacket, roomId: number) {
    const roomName = `${roomId}`;
    this.server.to(roomName).emit(GAME_EVENTS.GameObjectState, {
      roomId,
      data,
    });
    const gameSession = this.gameSessionService.getGameSession(roomId);
    // if one of the event is a GameEnded event, we need to handle it
    if (gameSession.state === GameMonitorState.Ended) {
      if (gameSession.state === GameMonitorState.Ended) {
        this.server
          .to(roomName)
          .emit(GAME_EVENTS.GameStateChanged, GameMonitorState.Ended);
      }
    }
  }

  public sendScored(
    roomId: number,
    scores: Array<{ userId: number; score: number }>,
  ) {
    const roomName = `${roomId}`;
    this.server.to(roomName).emit(GAME_EVENTS.ScoreChanged, {
      roomId,
      data: scores,
    });
    const gameSession = this.gameSessionService.getGameSession(roomId);
    this.handleGameEvents(gameSession);
  }

  public sendBallPaddleCollision(paddleUserId: number, roomId: number) {
    const roomName = `${roomId}`;
    this.server.to(roomName).emit(GAME_EVENTS.BallPaddleCollision, {
      roomId,
      data: paddleUserId,
    });
    const gameSession = this.gameSessionService.getGameSession(roomId);
    this.handleGameEvents(gameSession);
  }
}
