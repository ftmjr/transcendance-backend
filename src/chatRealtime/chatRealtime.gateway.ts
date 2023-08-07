import { Logger, UseGuards } from '@nestjs/common';
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
  NewRoom,
  Message,
  ServerToClientEvents,
  ClientToServerEvents,
} from './interfaces/chat.interface';
import { ChatRealtimeService } from './chatRealtime.service';
import { AuthenticatedGuard } from '../auth/guards';
import { ApiBearerAuth } from '@nestjs/swagger';

@WebSocketGateway({ namespace: 'chat' })
export class ChatRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private chatService: ChatRealtimeService) {}
  @WebSocketServer() server: Server = new Server<
    ServerToClientEvents,
    ClientToServerEvents
  >();
  private logger = new Logger('ChatRealtimeGateway');

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Socket connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    // await this.chatService.removeUserFromAllRooms(client.id);
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

  @SubscribeMessage('updateRooms')
  async updateRoom(@MessageBody() payload: NewRoom) {
    this.logger.log(payload);
    this.logger.log('add this new room');
    this.server.emit('updateRooms', payload); // broadcast messages
  }

  @SubscribeMessage('getAllRooms')
  async retrieveAllRooms() {
    this.logger.log('add this new room');
    const fakeRoom = {
      name: 'hello',
    };
    this.server.emit('allRooms', fakeRoom); // broadcast messages
  }

  @SubscribeMessage('createRoom')
  async createRoom(@MessageBody() payload: NewRoom) {
    this.logger.log(payload);
    this.logger.log('trying to create a room');
    this.chatService.createRoom(payload);
  }
  @SubscribeMessage('joinRoom')
  async joinRoom(@MessageBody() payload: { roomName: string; userSocketId: any }) {
    if (payload.userSocketId) {
      await this.server.in(payload.userSocketId).socketsJoin(payload.roomName);
    }
  }
}
