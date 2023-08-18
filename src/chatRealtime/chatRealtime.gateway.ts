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
import { JwtService } from '@nestjs/jwt';
import { AuthService, JwtPayload } from '../auth/auth.service';
import { MessageDto } from './dto';

@WebSocketGateway({ namespace: 'chat' })
export class ChatRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server = new Server<
    ServerToClientEvents,
    ClientToServerEvents
  >();
  constructor(
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
  // @SubscribeMessage('chat')
  // async newMessage(
  //   @ConnectedSocket() client: Socket,
  //   @MessageBody() message: string,
  // ) {
  //   const newMessage = await this.repository.createMessage({
  //     data: {
  //       chatroomId: client.data.roomId,
  //       memberId: client.data.user.id,
  //       content: message,
  //     },
  //   });
  //   this.service.emitTo('chat', client.data.room.name, newMessage);
  // }

  @SubscribeMessage('message')
  async newChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: string,
  ) {
    let createdMessage;
    if (client.data.room === 'General') {
      createdMessage = await this.service.createGeneralMessage(client, message);
    } else {
      createdMessage = await this.service.createRoomMessage(client, message);
    }
    this.server.to(client.data.room).emit('message', createdMessage);
  }
  @SubscribeMessage('updateRooms')
  async updateRooms() {
    this.server.emit('updateRooms');
  }
  @SubscribeMessage('updateRoomMembers')
  async updateRoomMembers(@ConnectedSocket() client: Socket) {
    this.server.to(client.data.room).emit('updateRoomMembers');
  }
  @SubscribeMessage('joinRoom')
  async joinRoom(
    @MessageBody() roomName: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (client.data.room) {
      await this.server.in(client.id).socketsLeave(client.data.room);
      client.data.room = null;
    }
    await this.server.in(client.id).socketsJoin(roomName);
    client.data.room = roomName;
  }
  @SubscribeMessage('kick')
  async kickMember(
    @ConnectedSocket() client: Socket,
    @MessageBody() otherId: number,
  ) {
    await this.service.kickChatRoomMember(otherId);
  }
  @SubscribeMessage('mute')
  async muteMember(
    @ConnectedSocket() client: Socket,
    @MessageBody() otherId: number,
  ) {
    console.log(otherId);
    await this.service.muteChatRoomMember(otherId);
  }
  @SubscribeMessage('unmute')
  async unmuteMember(
    @ConnectedSocket() client: Socket,
    @MessageBody() otherId: number,
  ) {
    await this.service.unmuteChatRoomMember(otherId);
  }
  @SubscribeMessage('ban')
  async banMember(
    @ConnectedSocket() client: Socket,
    @MessageBody() otherId: number,
  ) {
    await this.service.banChatRoomMember(otherId);
  }
}
