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
  GAME_EVENTS,
  GameSession,
  GameUserType,
  GAME_STATE,
  PAD_DIRECTION,
  PadMovedData,
  BallServedData,
} from './interfaces';
import { JoinGameEvent, GameActionDto, GameUser } from './dto';
import { GameSessionService } from './game-session.service';

@WebSocketGateway({ namespace: 'game' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private gameRealtimeService: GameRealtimeService,
    private gameSessionService: GameSessionService,
  ) {}

  handleConnection(client: Socket, ...args: any[]) {
    console.log('New game client connected', client.id);
  }

  handleDisconnect(@ConnectedSocket() client: Socket): any {
    try {
      const gameSession = this.gameRealtimeService.handleDisconnect(client.id);
      this.handleGameEvents(gameSession);
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
      );
      const roomName = `${joinData.roomId}`;
      await client.join(roomName);
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
      await client.join(roomName);
      this.handleGameEvents(gameSession);
    }
  }

  @SubscribeMessage(GAME_EVENTS.PadMoved)
  async handlePadMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() received: { roomId: number; data: PadMovedData },
  ) {
    // emit in the room to all other players except the sender
    client.broadcast
      .to(received.roomId.toString())
      .emit(GAME_EVENTS.PadMoved, received);
  }

  @SubscribeMessage(GAME_EVENTS.BallServed)
  async handleBallServe(
    @ConnectedSocket() client: Socket,
    @MessageBody() received: { roomId: number; data: BallServedData },
  ) {
    // emit in the room to all other players except the sender
    client.broadcast
      .to(received.roomId.toString())
      .emit(GAME_EVENTS.BallServed, received);
  }

  @SubscribeMessage(GAME_EVENTS.GameStateChanged)
  async handleGameStateChange(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    received: { roomId: number; user: GameUser; gameState: GAME_STATE },
  ) {
    const { roomId, user, gameState } = received;
    const gameSession = this.gameSessionService.getGameSession(roomId);
    if (!gameSession) return;
    this.gameRealtimeService.SyncMonitorsStates(
      gameState,
      user.userId,
      gameSession,
    );
    this.handleGameEvents(gameSession);
  }

  @SubscribeMessage(GAME_EVENTS.Scored)
  async handleScored(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    received: { roomId: number; user: GameUser; isIa: boolean },
  ) {
    const { roomId, user, isIa } = received;
    const gameSession = this.gameSessionService.getGameSession(roomId);
    if (!gameSession) return;
    this.gameRealtimeService.handleScoreUpdate(user.userId, gameSession, isIa);
    this.handleGameEvents(gameSession);
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

  private handleGameEvents(gameSession: GameSession) {
    const roomName = `${gameSession.gameId}`;
    gameSession.eventsToPublishInRoom.forEach((eventObj) => {
      const { event, data } = eventObj;
      if (this.server.to(roomName).emit(event, data)) {
      }
    });
    gameSession.eventsToPublishInRoom.splice(
      0,
      gameSession.eventsToPublishInRoom.length,
    );
  }
}
