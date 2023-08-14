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
import { ChatRoom } from '@prisma/client';

@WebSocketGateway({ namespace: 'chat' })
export class ChatRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server = new Server<
    ServerToClientEvents,
    ClientToServerEvents
  >();
  private logger = new Logger('ChatRealtimeGateway');

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Socket connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected : ${client.id}`);
  }
  @SubscribeMessage('chat')
  async handleEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: string,
  ) {
    // this.logger.log(payload);
    this.server.to(client.data.roomName).emit('chat', message); // broadcast messages
  }

  @SubscribeMessage('updateRooms')
  async updateRooms() {
    this.server.emit('updateRooms');
  }

  @SubscribeMessage('updateRoomMembers')
  async updateRoomMembers(@ConnectedSocket() client: Socket) {
    this.server.to(client.data.roomName).emit('updateRoomMembers');
  }
  @SubscribeMessage('joinRoom')
  async joinRoom(
    @MessageBody() payload: { roomName: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (client.id) {
      await this.server.in(client.id).socketsJoin(payload.roomName);
      client.data.room = payload.roomName;
    }
  }
  @SubscribeMessage('leaveRoom')
  async leaveRoom(
    @MessageBody() payload: { roomName: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (client.id) {
      if (client.data.roomName) {
        await this.server.in(client.id).socketsLeave(client.data.roomName);
      }
      client.data.room = null;
    }
  }
}
