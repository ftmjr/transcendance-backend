import { Injectable } from '@nestjs/common';
import { ChatRealtimeRepository } from './chatRealtime.repository';
import { CreateRoomDto } from './dto/createRoom.dto';
import { ChatRoom, Prisma, User } from "@prisma/client";
import { NewRoom } from "./interfaces/chat.interface";


function exclude<ChatRoom, Key extends keyof ChatRoom>(
  room: ChatRoom,
  keys: Key[],
): Omit<ChatRoom, Key> {
  for (const key of keys) {
    delete room[key];
  }
  return room;
}

@Injectable()
export class ChatRealtimeService {
  constructor(private repository: ChatRealtimeRepository) {}

  async getRooms() {
    const rooms = await this.repository.getRooms({
      where: { private: false },
    });
    return rooms.map((room) => exclude(room, ['password', 'private']));
  }

  async createRoom(newRoom: NewRoom) {
    const data: Prisma.ChatRoomCreateInput = {
      name: newRoom.name,
      private: newRoom.private,
      protected: newRoom.protected,
      password: '',
    };
    if (newRoom.protected) {
      data.password = newRoom.password;
    }
    return this.repository.createRoom({ data }, newRoom.ownerId);
  }

  async leaveRoom(user: User, roomId: number) {
    return await this.repository.leaveRoom(user, roomId);
  }

  // async joinRoom(owner: User, joinRoom: JoinRoomDto) {
  //   return await this.repository.joinRoom();
  //   }
}
