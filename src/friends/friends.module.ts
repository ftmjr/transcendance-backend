import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { FriendsRepository } from './friends.repository';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [MessageModule],
  controllers: [FriendsController],
  providers: [FriendsService, FriendsRepository],
  exports: [FriendsService],
})
export class FriendsModule {}
