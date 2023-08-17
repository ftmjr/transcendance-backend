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
  ServerToClientEvents,
  ClientToServerEvents,
} from './interfaces/chat.interface';
import { ChatRealtimeService } from './chatRealtime.service';
import { AuthenticatedGuard } from '../auth/guards';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ChatRoom } from '@prisma/client';
import { ChatRealtimeRepository } from './chatRealtime.repository';
import { JwtService } from '@nestjs/jwt';
import {AuthService, JwtPayload} from "../auth/auth.service";

@WebSocketGateway({ namespace: 'chat' })
export class ChatRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private repository: ChatRealtimeRepository,
    private service: ChatRealtimeService,
    private authService: AuthService,
    private jwt: JwtService,
  ) {}
  private logger = new Logger('ChatRealtimeGateway');

  async decodeJwtToken(token: string): Promise<JwtPayload | null> {
    try {
      const decodedToken = this.jwt.verify(token, {
        secret: process.env.JWT_SECRET,
      }) as JwtPayload;
      return decodedToken;
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      return null;
    }
  }
  async handleConnection(@ConnectedSocket() client, ...args: any[]) {
    this.logger.log(`Client connected : ${client.id}`);
    if (!client.handshake.headers.authorization) {
      return await this.handleDisconnect(client);
    }
    const token = client.handshake.headers.authorization.split(' ')[1];
    const decodedToken = await this.decodeJwtToken(token);

    if (!decodedToken) {
      return await this.handleDisconnect(client);
    }
    const { userId, sessionId } = decodedToken.sub;
    const user = await this.authService.getUserFromJwt(userId, sessionId);
    if (!user) {
      return await this.handleDisconnect(client);
    }
    client.data.user = user;
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected : ${client.id}`);
  }
  @SubscribeMessage('chat')
  async newMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: string,
  ) {
    const newMessage = await this.repository.createMessage({
      data: {
        chatroomId: client.data.roomId,
        memberId: client.data.user.id,
        content: message,
      },
    });
    this.service.emitTo('chat', client.data.room.name, newMessage);
  }

  @SubscribeMessage('updateRooms')
  async updateRooms() {
    this.service.emitOn('updateRooms');
  }

  @SubscribeMessage('updateRoomMembers')
  async updateRoomMembers(@ConnectedSocket() client: Socket) {
    this.service.emitTo('updateRoomMembers', client.data.room.name, null);
  }
  @SubscribeMessage('joinRoom')
  async joinRoom(
    @MessageBody() payload: { roomName: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (client.id) {
      const room = await this.repository.getRoom(payload.roomName);
      if (room) {
        client.data.room = room;
        this.service.socketJoin(client.id, room.name);
      }
    }
  }
  @SubscribeMessage('leaveRoom')
  async leaveRoom(@ConnectedSocket() client: Socket) {
    if (client.id) {
      if (client.data.room.name) {
        this.service.socketLeave(client.id, client.data.room.name);
      }
      client.data.room = null;
    }
  }
}
