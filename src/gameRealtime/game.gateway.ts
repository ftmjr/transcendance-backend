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
import { JoinGameEvent } from './dto';

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
  ) {
    console.log('Received join game event', joinGameEvent);
    let gameSession: GameSession | undefined;
    if (joinGameEvent.roomId === 0) {
      const game = await this.gameRealtimeService.addPlayerInWaitingRoom(
        joinGameEvent.user.userId,
      );
      gameSession = this.gameRealtimeService.getGameSession(game.id);
    } else {
      const game = await this.gameRealtimeService.addPlayerToGame(
        joinGameEvent.roomId,
        joinGameEvent.user.userId,
      );
      gameSession = this.gameRealtimeService.getGameSession(game.id);
    }
    if (gameSession) {
      client.join(gameSession.gameId.toString());
      client.emit(GAME_EVENTS.JoinGame, {
        roomId: gameSession.gameId,
      });
      client.emit(GAME_EVENTS.PlayerAdded, {
        players: gameSession.participantIds,
      });
    }
  }

  @SubscribeMessage('gameAction')
  handleGameAction(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ): string {
    console.log('gameAction received from client', client.id);
    console.log(data);
    return 'oh an action';
  }
}
