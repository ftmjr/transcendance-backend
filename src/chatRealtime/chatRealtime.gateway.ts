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
import { ServerToClientEvents, ClientToServerEvents } from './interfaces/chat.interface';
import { ChatRealtimeService } from './chatRealtime.service';
import { AuthenticatedGuard } from '../auth/guards';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ChatRoom } from '@prisma/client';
import {ChatRealtimeRepository} from "./chatRealtime.repository";
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ namespace: 'chat' })
export class ChatRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server = new Server<
    ServerToClientEvents,
    ClientToServerEvents
  >();
  constructor (private repository : ChatRealtimeRepository,
               private jwt: JwtService,) {}
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
  handleConnection(client: Socket, ...args: any[]) {
    const token = client.handshake.headers.authorization.split(' ')[1];
    const decodedToken = await this.decodeJwtToken(token);

    if (!decodedToken) {
      await this.handleDisconnect(client);
      return;
    }
    const { userId, sessionId } = decodedToken.sub;
    const user = await this.authService.getUserFromJwt(userId, sessionId);
    if (!user) {
      await this.handleDisconnect(client);
      return;
    }
    client.data.user = user;
    await this.changeStatus(userId, Status.Online);
    this.server.in(client.id).socketsJoin('General');
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
      }
    });
    this.server.to(client.data.roomId).emit('chat', newMessage); // broadcast messages
  }

  @SubscribeMessage('updateRooms')
  async updateRooms() {
    this.server.emit('updateRooms');
  }

  @SubscribeMessage('updateRoomMembers')
  async updateRoomMembers(@ConnectedSocket() client: Socket) {
    this.server.to(client.data.roomId).emit('updateRoomMembers');
  }
  @SubscribeMessage('joinRoom')
  async joinRoom(
    @MessageBody() payload: { roomName: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (client.id) {
      const room = await this.repository.getRoom(payload.roomName);
      if (room) {
        await this.server.in(client.id).socketsJoin(room.id);
      }
      client.data.roomId = room.id;
    }
  }
  @SubscribeMessage('leaveRoom')
  async leaveRoom(
    @MessageBody() payload: { roomName: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (client.id) {
      if (client.data.roomId) {
        await this.server.in(client.id).socketsLeave(client.data.roomId);
      }
      client.data.roomId = null;
    }
  }
}
