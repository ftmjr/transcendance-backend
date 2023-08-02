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
  JoinGameData,
  PadMovedData,
} from './interfaces';
import { JoinGameEvent, JoinGameResponse } from './dto';
import { GameActionDto } from './dto/gameAction.dto';
import { GAME_STATE, PAD_DIRECTION } from './interfaces/gameActions.interface';

@WebSocketGateway({ namespace: 'game' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private gameRealtimeService: GameRealtimeService) {}

  handleConnection(client: Socket, ...args: any[]) {
    console.log('New client connected', client.id);
  }

  handleDisconnect(client: Socket) {
    try {
      this.gameRealtimeService
        .handleDisconnect(client.id)
        .then((gameSession) => {
          this.handleGameEvents(gameSession);
        })
        .catch((e) => {
          console.log(e);
        });
    } catch (e) {
      console.log(e);
    }
  }

  @SubscribeMessage(GAME_EVENTS.JoinGame)
  async handleJoinGame(
    @MessageBody() joinGameEvent: JoinGameEvent,
    @ConnectedSocket() client: Socket,
  ): Promise<JoinGameResponse> {
    try {
      const gamer = {
        ...joinGameEvent.user,
        clientId: client.id,
      };
      const data: JoinGameData = { ...joinGameEvent, user: gamer };
      const gameSession = await this.gameRealtimeService.handleJoiningAGame(
        data,
      );
      await client.join(gameSession.gameId.toString());
      this.handleGameEvents(gameSession);
      return {
        worked: true,
        roomId: gameSession.gameId,
      };
    } catch (error) {
      console.log(`Error handling JoinGame: ${error.message}`);
      console.error(error);
      return { worked: false, roomId: 0 };
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

  // Handle game state change
  @SubscribeMessage(GAME_EVENTS.GameStateChanged)
  async handleGameStateChange(client: Socket, gameAction: GameActionDto) {
    const { roomId, user, isIA, actionData } = gameAction;
    const data = actionData as GAME_STATE[];
    const gameSession = this.gameRealtimeService.currentManagedGames.find(
      (g) => g.gameId === roomId,
    );
    if (!gameSession) {
      console.log(`Game with id ${roomId} does not exist`);
      return;
    }
    switch (data[0]) {
      case GAME_STATE.waiting:
        this.gameRealtimeService.handleGameStart(data[0], user, gameSession);
        break;
      case GAME_STATE.playing:
        this.gameRealtimeService.handleGameStart(data[0], user, gameSession);
        break;
      case GAME_STATE.scored:
        this.gameRealtimeService.handleScoreUpdate(
          data[0],
          user,
          gameSession,
          isIA,
        );
        break;
    }
    // send any game events
    this.handleGameEvents(gameSession);
  }

  private handleGameEvents(gameSession: GameSession) {
    const room = gameSession.gameId.toString();
    gameSession.events.forEach((eventObj) => {
      const { event, data } = eventObj;
      if (this.server.to(room).emit(event, data)) {
        console.log(`Emitted ${event} to room ${gameSession.gameId}`);
      }
    });
    // after emitting events, clear the events array
    gameSession.events.splice(0, gameSession.events.length);
  }
}
