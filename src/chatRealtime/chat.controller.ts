import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Param } from '@nestjs/common';
import { Room, User } from './interfaces/chat.interface';
import { ChatService } from './chat.service';

@ApiTags('ChatActions')
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}
  @Get('api/rooms')
  async getAllRooms(): Promise<Room[]> {
    return await this.chatService.getRooms();
  }

  @Get('api/rooms/:room')
  async getRoom(@Param() params): Promise<Room> {
    const rooms = await this.chatService.getRooms();
    const room = await this.chatService.getRoomByName(params.room);
    return rooms[room];
  }
}
