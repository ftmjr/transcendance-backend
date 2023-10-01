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
} from './interfaces';
import { JoinGameEvent, GameActionDto } from './dto';
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
    @MessageBody() gameAction: GameActionDto,
  ) {
    const { roomId, user, isIA, actionData } = gameAction;
    const info: PadMovedData = {
      userId: isIA ? 0 : user.userId,
      direction: actionData[0] as PAD_DIRECTION,
    };
    client.to(roomId.toString()).emit(GAME_EVENTS.PadMoved, {
      id: roomId,
      data: info,
    });
  }

  // Handle ball serve
  @SubscribeMessage(GAME_EVENTS.BallServed)
  async handleBallServe(
    @ConnectedSocket() client: Socket,
    @MessageBody() gameAction: GameActionDto,
  ) {
    const { roomId, user, isIA, actionData } = gameAction;
    client.to(roomId.toString()).emit(GAME_EVENTS.BallServed, {
      id: roomId,
      data: {
        userId: isIA ? 0 : user.userId,
        position: actionData[0],
        direction: actionData[1],
      },
    });
  }

  @SubscribeMessage(GAME_EVENTS.GameStateChanged)
  async handleGameStateChange(client: Socket, gameAction: GameActionDto) {
    const { roomId, user, isIA, actionData } = gameAction;
    const data = actionData as GAME_STATE[];
    const gameSession = this.gameSessionService.getGameSession(roomId);
    if (!gameSession) {
      console.log(`Game with id ${roomId} does not exist`);
      return;
    }
    switch (data[0]) {
      case GAME_STATE.waiting:
        this.gameRealtimeService.SyncMonitorsStates(
          data[0],
          user.userId,
          gameSession,
        );
        break;
      case GAME_STATE.playing:
        this.gameRealtimeService.SyncMonitorsStates(
          data[0],
          user.userId,
          gameSession,
        );
        break;
      case GAME_STATE.scored:
        this.gameRealtimeService.handleScoreUpdate(
          data[0],
          user.userId,
          gameSession,
          isIA,
        );
        break;
    }
    // send any game events
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
