import { ApiTags , ApiOperation } from '@nestjs/swagger';
import { Controller, Get, Param, Post } from '@nestjs/common';
import { NewRoom, Room, User } from './interfaces/chat.interface';
import { ChatService } from './chat.service';

@ApiTags('ChatActions')
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}
  @Get('rooms')
  async getAllRooms(): Promise<Room[]> {
    return await this.chatService.getRooms();
  }

  @Get('rooms/:room')
  async getRoom(@Param() params): Promise<Room> {
    const rooms = await this.chatService.getRooms();
    const room = await this.chatService.getRoomByName(params.room);
    return rooms[room];
  }

  // @ApiOperation({
  //   summary: 'Tries to create a new chat room',
  // })
  // @Post('create-room')
  // async createRoom(@Body() params: NewRoom) {
  //   return this.chatService.createRoom();
  // }
}
