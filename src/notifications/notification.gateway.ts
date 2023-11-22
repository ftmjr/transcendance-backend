import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { User, Notification as NotificationT } from '@prisma/client';
import { RealTimeNotification } from './notification.service';

@WebSocketGateway({ namespace: 'notification' })
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  handleConnection(client: Socket, ...args: any[]) {
    // console.log(`Client connected on notification : ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // console.log(`Client disconnected on notification : ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(client: Socket, userId: string) {
    const room = `notification:${userId}`;
    // check if client has already joined the room
    const rooms = Object.keys(client.rooms);
    if (!rooms.includes(room)) client.join(room);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, roomId: string) {
    const room = `room:${roomId}`;
    // check if client has already joined the room
    const rooms = Object.keys(client.rooms);
    if (!rooms.includes(room)) client.join(room);
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(client: Socket, roomId: string) {
    const room = `room:${roomId}`;
    // check if client has already joined the room
    const rooms = Object.keys(client.rooms);
    if (rooms.includes(room)) client.leave(room);
  }

  sendNotificationToUser(userId: User[`id`], data: NotificationT) {
    const room = `notification:${userId}`;
    this.server.to(room).emit('notification', data);
  }

  sendRealTimeNotificationToUser(
    userId: User[`id`],
    notification: RealTimeNotification,
  ) {
    const room = `notification:${userId}`;
    this.server.to(room).emit('realtime-notification', notification);
  }

  sendGeneralRealTimeNotification(notification: RealTimeNotification) {
    this.server.emit('realtime-notification', notification);
  }

  sendRealTimeNotificationToRoomMembers(
    roomId: number,
    notification: RealTimeNotification,
  ) {
    const room = `room:${roomId}`;
    this.server.to(room).emit('realtime-notification', notification);
  }
}
