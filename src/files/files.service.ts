import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { ChatRealtimeService } from '../chatRealtime/chatRealtime.service';
import { ChatRoomWithMembers } from '../chatRealtime/chatRealtime.repository';

@Injectable()
export class FilesService {
  constructor(
    private usersService: UsersService,
    private chatService: ChatRealtimeService,
  ) {}
  updateAvatarUrl(fileName: string, user: User) {
    const serverBaseUrl = 'https://' + process.env.URL + '/api';
    const fileUrl = `${serverBaseUrl}/uploads/${fileName}`;
    return this.usersService.updateProfile({
      where: { userId: user.id },
      data: {
        avatar: fileUrl,
      },
      include: {
        awards: true,
      },
    });
  }
  updateChatRoomAvatar(
    fileName: string,
    roomId: number,
    source: User,
  ): Promise<ChatRoomWithMembers> {
    const serverBaseUrl = 'https://' + process.env.URL + '/api';
    const fileUrl = `${serverBaseUrl}/uploads/room/${fileName}`;
    return this.chatService.changeChatAvatar(roomId, source.id, fileUrl);
  }

  deleteCurrentUserAvatar(user: User) {
    // TODO: delete the file from the server if  not in the default list
    return this.usersService.updateProfile({
      where: {
        userId: user.id,
      },
      data: {
        avatar: this.getRandomAvatarUrl(),
      },
    });
  }

  getRandomAvatarUrl(): string {
    const serverBaseUrl = 'https://' + process.env.URL + '/api';
    const list = [
      'randomAvatars/icons8-bart-simpson-500.png',
      'randomAvatars/icons8-batman-500.png',
      'randomAvatars/icons8-character-500.png',
      'randomAvatars/icons8-deadpool-500.png',
      'randomAvatars/icons8-dj-500.png',
      'randomAvatars/icons8-finn-500.png',
      'randomAvatars/icons8-futurama-bender-500.png',
      'randomAvatars/icons8-homer-simpson-500.png',
      'randomAvatars/icons8-lisa-simpson-500.png',
      'randomAvatars/icons8-marge-simpson-500.png',
      'randomAvatars/icons8-owl-500.png',
      'randomAvatars/icons8-unicorn-500.png',
    ];
    const image = list[Math.floor(Math.random() * list.length)];
    return `${serverBaseUrl}/${image}`;
  }
}
