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
import {UsersService} from "../users/users.service";

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
    private usersService: UsersService,
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
    console.log(client.data.user.blockedFrom);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected : ${client.id}`);
  }
  @SubscribeMessage('dm')
  async newMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: string
  ) {
    const newMessage = await this.service.createPrivateMessage({
      data: {
        senderId: client.data.user.id,
        receiverId: client.data.receiverId,
        text: message,
      },
    });
    console.log("receiver username: " + client.data.receiverUsername);
    this.server.to(client.data.user.username).emit('dm', newMessage);
    if (client.data.user.username !== client.data.receiverUsername)
    {
      this.server.to(client.data.receiverUsername).emit('dm', newMessage);
    }
  }

  @SubscribeMessage('addReceiver')
  async addReceiver(
    @ConnectedSocket() client: Socket,
    @MessageBody() receiverId: number,
  ) {
    client.data.receiverId = receiverId;
    const receiver = await this.usersService.getUser({id: receiverId});
    client.data.receiverUsername = receiver.username;
  }

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
  @SubscribeMessage('filter')
  filterBlockedMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: any,
  ) {
    const { blockedFrom, blockedUsers } = client.data.user;
    const isBlockedFrom = blockedFrom.some(
      (blocked) => blocked.userId === message.userId,
    );
    const isBlockedUser = blockedUsers.some(
      (blocked) => blocked.blockedUserId === message.userId,
    );
    if (isBlockedFrom || isBlockedUser) {
      return;
    }
    this.server.to(client.id).emit('filter', message);
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
  @SubscribeMessage('joinUsers')
  async joinUsers(@ConnectedSocket() client: Socket) {
    await this.server.in(client.id).socketsJoin(client.data.user.username);
  }
  @SubscribeMessage('promote')
  async promoteMember(
    @ConnectedSocket() client: Socket,
    @MessageBody() otherId: number,
  ) {
    await this.service.promoteChatRoomMember(otherId);
  }
}
