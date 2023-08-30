import { Body, Logger } from '@nestjs/common';
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

@WebSocketGateway({ namespace: 'chat' })
export class ChatRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server = new Server<
    ServerToClientEvents,
    ClientToServerEvents
  >();
  constructor(private service: ChatRealtimeService) {}
  private logger = new Logger('ChatRealtimeGateway');
  handleConnection(@ConnectedSocket() client, ...args: any[]) {
    this.logger.log(`Client connected : ${client.id}`);
    const user = client.handshake.auth.user;
    if (!user) {
      return this.handleDisconnect(client);
    }
    client.data.user = user;
    client.data.room = 'General';
    this.server.in(client.id).socketsJoin('user:' + user.username);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected : ${client.id}`);
  }
  @SubscribeMessage('dm')
  async newMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: string,
  ) {
    const newMessage = await this.service.createPrivateMessage({
      data: {
        senderId: client.data.user.id,
        receiverId: client.data.receiverId,
        text: message,
      },
    });
    this.server.to('user:' + client.data.user.username).emit('dm', newMessage);
    if (client.data.user.username !== client.data.receiverUsername) {
      this.server
        .to('user:' + client.data.receiverUsername)
        .emit('dm', newMessage);
    }
  }

  @SubscribeMessage('addReceiver')
  async addReceiver(
    @ConnectedSocket() client: Socket,
    @MessageBody() receiver,
  ) {
    client.data.receiverId = receiver.id;
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
    this.server.to('room:' + client.data.room).emit('message', createdMessage);
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
    this.server.to('room:' + client.data.room).emit('updateRoomMembers');
  }
  @SubscribeMessage('joinRoom')
  async joinRoom(
    @MessageBody() roomName: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (client.data.room) {
      await this.server.in(client.id).socketsLeave('room:' + client.data.room);
      client.data.room = null;
    }
    await this.server.in(client.id).socketsJoin('room:' + roomName);
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
  @SubscribeMessage('promote')
  async promoteMember(
    @ConnectedSocket() client: Socket,
    @MessageBody() otherId: number,
  ) {
    await this.service.promoteChatRoomMember(otherId);
  }
  @SubscribeMessage('game')
  async linkUsernameToGame(@ConnectedSocket() client: Socket) {
    this.server.in(client.id).socketsJoin('game:' + client.data.user.username);
  }
  @SubscribeMessage('game-invite')
  async inviteToPlay(
    @Body() username: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to('game:' + username).emit('game-invite', client.data.user);
  }
  @SubscribeMessage('game-accept')
  async acceptToPlay(@Body() username: string) {
    this.server.to('game:' + username).emit('game-accept');
  }
  @SubscribeMessage('game-reject')
  async rejectToPlay(@Body() username: string) {
    this.server.to('game:' + username).emit('game-reject');
  }
}
