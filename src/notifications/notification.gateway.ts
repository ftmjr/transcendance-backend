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
import { Logger } from '@nestjs/common';

@WebSocketGateway({ namespace: 'notification' })
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);
  @WebSocketServer() server: Server;

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected on notification: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected of notification: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(client: Socket, userId: number) {
    const room = `notification:${userId}`;
    // check if client has already joined the room
    const rooms = Object.keys(client.rooms);
    if (!rooms.includes(room)) client.join(room);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, roomId: number) {
    const room = `room-notification:${roomId}`;
    // check if client has already joined the room
    const rooms = Object.keys(client.rooms);
    if (!rooms.includes(room)) client.join(room);
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(client: Socket, roomId: number) {
    const room = `room-notification:${roomId}`;
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
    const room = `room-notification:${roomId}`;
    this.server.to(room).emit('realtime-notification', notification);
  }
}
