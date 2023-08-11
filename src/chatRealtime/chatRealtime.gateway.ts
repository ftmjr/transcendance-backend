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
    this.server.in(client.id).socketsJoin('General');
  }

  async handleDisconnect(client: Socket) {
    // await this.chatService.removeUserFromAllRooms(client.id);
    this.logger.log(`Client disconnected : ${client.id}`);
  }
  @SubscribeMessage('chat')
  async handleEvent(
    @MessageBody()
    payload: Message,
  ): Promise<Message> {
    // this.logger.log(payload);
    this.server.to(payload.roomName).emit('chat', payload); // broadcast messages
    return payload;
  }

  @SubscribeMessage('updateRooms')
  async updateRooms(newRoom: ChatRoom, action: string) {
    const payload = {
      action: action,
      roomName: newRoom.name,
      protected: newRoom.protected,
    };
    if (!newRoom.private) {
      this.server.emit('updateRooms', payload);
    }
  }
  @SubscribeMessage('joinRoom')
  async joinRoom(
    @MessageBody() payload: { roomName: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (client.id) {
      await this.server.in(client.id).socketsJoin(payload.roomName);
    }
  }
  @SubscribeMessage('leaveRoom')
  async leaveRoom(
    @MessageBody() payload: { roomName: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (client.id) {
      await this.server.in(client.id).socketsLeave(payload.roomName);
    }
  }
}
