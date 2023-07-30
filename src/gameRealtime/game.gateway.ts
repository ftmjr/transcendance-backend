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
import { GAME_EVENTS, GameMonitorState, GameSession } from './interfaces';
import { GameUser, JoinGameEvent, JoinGameResponse } from './dto';
import { GameActionDto } from './dto/gameAction.dto';
import { GAME_STATE } from './interfaces/gameActions.interface';

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

  @SubscribeMessage(GAME_EVENTS.PadMoved)
  async handlePadMove(client: Socket, gameAction: GameActionDto) {
    const { roomId, user, isIA, actionData } = gameAction;
    // Your logic here
    // Example:
    // console.log('PadMoved received from client', {
    //   client: client.id,
    //   roomId,
    //   user,
    //   isIA,
    //   actionData,
    // });
  }

  // Handle ball serve
  @SubscribeMessage(GAME_EVENTS.BallServed)
  async handleBallServe(client: Socket, gameAction: GameActionDto) {
    const { roomId, user, isIA, actionData } = gameAction;
    // Your logic here
    // Example:
    // console.log('BallServed received from client', {
    //   client: client.id,
    //   roomId,
    //   user,
    //   isIA,
    //   actionData,
    // });
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
      case GAME_STATE.ballServing:
        console.log('GameStateChanged received, ball is serving', gameSession);
        break;
      case GAME_STATE.scored:
        this.gameRealtimeService.handleScoreUpdate(
          data[0],
          user,
          gameSession,
          isIA,
        );
        break;
      case GAME_STATE.finished:
        console.log('GameStateChanged received, game is finished', gameSession);
        break;
    }
    // send any game events
    this.handleGameEvents(gameSession);
  }

  // Handle game end
  @SubscribeMessage(GAME_EVENTS.GameResult)
  async handleGameEnd(client: Socket, gameAction: GameActionDto) {
    const { roomId, user, isIA, actionData } = gameAction;
    // Your logic here
    // Example:
    // console.log('GameResult received from client', {
    //   client: client.id,
    //   roomId,
    //   user,
    //   isIA,
    //   actionData,
    // });
  }
  private handleGameEvents(gameSession: GameSession) {
    const room = gameSession.gameId.toString();
    gameSession.events.forEach((eventObj) => {
      const { event, data } = eventObj;
      if (this.server.to(room).emit(event, data)) {
        console.log(`Emitted ${event} to room ${gameSession.gameId}`);
        console.log('data', data);
      }
    });
    // after emitting events, clear the events array
    gameSession.events.splice(0, gameSession.events.length);
  }
}
