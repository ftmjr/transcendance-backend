import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { User } from '@prisma/client';

@WebSocketGateway({ namespace: 'notification' })
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  handleConnection(client: Socket, ...args: any[]) {
    console.log(`Client connected on notification : ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // console.log(`Client disconnected on notification : ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(client: Socket, userId: string) {
    const room = `notification:${userId}`;
    client.join(room);
  }

  sendNotificationToUser(userId: User[`id`], data: any) {
    const room = `notification:${userId}`;
    this.server.to(room).emit('notification', data);
    console.log(`Notification sent to ${userId}`);
  }
}
