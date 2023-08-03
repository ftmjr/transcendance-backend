import { Logger } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  User,
  Message,
  ServerToClientEvents,
  ClientToServerEvents,
} from './interfaces/chat.interface';
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: {
  origin: 'https://localhost',
  }, namespace: 'chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private chatService: ChatService) {}
  @WebSocketServer() server: Server = new Server<
    ServerToClientEvents,
    ClientToServerEvents
  >();
  private logger = new Logger('ChatGateway');

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Socket connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    await this.chatService.removeUserFromAllRooms(client.id);
    this.logger.log(`Client disconnected : ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ): string {
    console.log('message received from client', client.id);
    console.log(data);
    this.server.emit('message', data); // broadcast messages
    return 'received';
  }
  @SubscribeMessage('chat')
  async handleEvent(
    @MessageBody()
    payload: Message,
  ): Promise<Message> {
    this.logger.log(payload);
    this.server.to(payload.roomName).emit('chat', payload); // broadcast messages
    return payload;
  }

  @SubscribeMessage('join_room')
  async handleSetClientDataEvent(
    @MessageBody()
    payload: {
      roomName: string;
      user: User;
    },
  ) {
    if (payload.user.socketId) {
      this.logger.log(
        `${payload.user.socketId} is joining ${payload.roomName}`,
      );
      await this.server.in(payload.user.socketId).socketsJoin(payload.roomName);
      await this.chatService.addUserToRoom(payload.roomName, payload.user);
    }
  }
}
