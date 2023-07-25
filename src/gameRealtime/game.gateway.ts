import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameRealtimeService } from './gameRealtime.service';
import { GAME_EVENTS, GameSession } from './interfaces';
import { JoinGameEvent, JoinGameResponse } from './dto';
import { GameActionDto } from './dto/gameAction.dto';

@WebSocketGateway({ namespace: 'game' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private gameRealtimeService: GameRealtimeService) {}

  handleConnection(client: Socket, ...args: any[]) {
    console.log('New client connected', client.id);
    console.log(args);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected', client.id);
  }

  @SubscribeMessage(GAME_EVENTS.JoinGame)
  async handleJoinGame(
    @MessageBody() joinGameEvent: JoinGameEvent,
    @ConnectedSocket() client: Socket,
  ): Promise<JoinGameResponse> {
    console.log('JoinGame received from client', client.id);
    console.log(joinGameEvent);
    try {
      const gameSession = await this.gameRealtimeService.handleJoiningAGame(
        joinGameEvent,
      );
      await client.join(gameSession.gameId.toString());
      this.handleGameEvents(gameSession);
      return {
        worked: true,
        roomId: gameSession.gameId,
      };
    } catch (error) {
      console.log(`Error handling JoinGame: ${error.message}`);
      return { worked: false, roomId: 0 };
    }
  }

  @SubscribeMessage('gameAction')
  handleGameAction(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('gameAction received from client', client.id);
    console.log('room', client.rooms);
    console.log(data);
  }

  // Handle pad move
  @SubscribeMessage(GAME_EVENTS.PadMoved)
  async handlePadMove(client: Socket, gameAction: GameActionDto) {
    const { roomId, user, isIA, actionData } = gameAction;
    // Your logic here
    // Example:
    console.log('PadMoved received from client', {
      client: client.id,
      roomId,
      user,
      isIA,
      actionData,
    });
  }

  // Handle ball serve
  @SubscribeMessage(GAME_EVENTS.BallServed)
  async handleBallServe(client: Socket, gameAction: GameActionDto) {
    const { roomId, user, isIA, actionData } = gameAction;
    // Your logic here
    // Example:
    console.log('BallServed received from client', {
      client: client.id,
      roomId,
      user,
      isIA,
      actionData,
    });
  }

  // Handle game state change
  @SubscribeMessage(GAME_EVENTS.GameStateChanged)
  async handleGameStateChange(client: Socket, gameAction: GameActionDto) {
    const { roomId, user, isIA, actionData } = gameAction;
    // Your logic here
    // Example:
    console.log('GameStateChanged received from client', {
      client: client.id,
      roomId,
      user,
      isIA,
      actionData,
    });
  }

  // Handle game end
  @SubscribeMessage(GAME_EVENTS.GameResult)
  async handleGameEnd(client: Socket, gameAction: GameActionDto) {
    const { roomId, user, isIA, actionData } = gameAction;
    // Your logic here
    // Example:
    console.log('GameResult received from client', {
      client: client.id,
      roomId,
      user,
      isIA,
      actionData,
    });
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
    gameSession.events = [];
  }
}
