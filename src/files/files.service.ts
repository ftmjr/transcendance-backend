import { Injectable } from '@nestjs/common';

@Injectable()
export class FilesService {
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
