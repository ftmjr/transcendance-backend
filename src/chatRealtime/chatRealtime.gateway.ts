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
import { ChatRealtimeService } from './chatRealtime.service';
import { Status } from '@prisma/client';

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
  async handleConnection(client: Socket, ...args: any[]): Promise<number[]> {
    try {
      const userId = client.handshake.query.userId;
      if (!userId) throw new Error('User ID is required');
      const id = Number(userId);
      await this.service.changeUserStatus(id, Status.Online);
    } catch (e) {
      client.emit('connectionError', e.message);
      client.disconnect();
      return [];
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    try {
      const userId = client.handshake.query.userId;
      if (userId) {
        await this.service.changeUserStatus(Number(userId), Status.Offline);
      }
    } catch (e) {
      this.logger.error(`Failed to handle disconnect: ${e.message}`);
    }
  }

  // Handle sending messages
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { senderId: number; roomId: number; content: string },
  ): Promise<void> {
    const { roomId, content, senderId } = data;
    try {
      const message = await this.service.sendMessageToRoom(
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
}
