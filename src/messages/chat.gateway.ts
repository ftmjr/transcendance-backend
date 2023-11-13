import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  ServerToClientEvents,
  ClientToServerEvents,
} from './interfaces/chat.interface';
import { ChatService } from './chat.service';
import { Status } from '@prisma/client';
import { MessageService } from './message.service';

@WebSocketGateway({ namespace: 'chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server = new Server<
    ServerToClientEvents,
    ClientToServerEvents
  >();

  constructor(
    private chatService: ChatService,
    private privateMessageService: MessageService,
  ) {}

  private logger = new Logger('ChatGateway');
  async handleConnection(client: Socket, ...args: any[]) {
    try {
      const userId = client.handshake.query.userId;
      if (!userId) throw new Error('User ID is required');
      // checki if already joined room `mp:${userId}`
      const rooms = Object.keys(client.rooms);
      if (!rooms.includes(`mp:${userId}`)) {
        client.join(`mp:${userId}`);
        this.logger.log(
          `Client connected to chat room: ${userId} - and joined mp:${userId}`,
        );
      }
    } catch (e) {
      client.emit('connectionError', e.message);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    // empty
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number; userId: number },
  ): Promise<void> {
    try {
      const { roomId, userId } = data;
      // check if client has already joined the room
      const rooms = Object.keys(client.rooms);
      if (!rooms.includes(`chat-room:${roomId}`)) {
        await this.chatService.canListenToRoom(userId, roomId);
        client.join(`chat-room:${roomId}`);
      }
    } catch (e) {
      client.emit('failedToJoinRoom', e.message);
    }
  }

  // Handle sending chat message
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { senderId: number; roomId: number; content: string },
  ): Promise<void> {
    const { roomId, content, senderId } = data;
    try {
      const message = await this.chatService.sendMessageToRoom(
        roomId,
        content,
        senderId,
      );
      this.server.to(`chat-room:${roomId}`).emit('newMessage', message);
    } catch (e) {
      this.server
        .to(`chat-room:${roomId}`)
        .emit('failedToSendMessage', e.message);
    }
  }

  // handle sending private message
  @SubscribeMessage('sendPrivateMessage')
  async handlePrivateMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { senderId: number; receiverId: number; content: string },
  ): Promise<void> {
    const { senderId, receiverId, content } = data;
    try {
      const message = await this.privateMessageService.createPrivateMessage(
        { content, receiverId },
        senderId,
      );
      this.logger.log(
        `Client with userId: ${senderId} send to : ${receiverId}`,
      );
      this.server.to(`mp:${senderId}`).emit('newMP', message);
      client.broadcast.to(`mp:${receiverId}`).emit('newMP', message);
    } catch (e) {
      this.server.to(`mp:${senderId}`).emit('failedToSendMessage', e.message);
    }
  }
}
