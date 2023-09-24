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
    // const user = client.handshake.auth.user;
    // if (!user) {
    //   return this.handleDisconnect(client);
    // }
    // client.data.user = user;
    // this.server.in(client.id).socketsJoin('user:' + user.username);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected : ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { senderId: number; roomId: number; content: string },
  ): Promise<void> {
    const { roomId, content, senderId } = data;
    const message = await this.service.sendMessageToRoom(
      roomId,
      content,
      senderId,
    );
    this.server.to(`room:${data.roomId}`).emit('newMessage', message);
  }
}
