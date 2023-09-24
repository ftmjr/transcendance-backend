import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { UsersModule } from '../users/users.module';
import { ChatRealtimeModule } from '../chatRealtime/chatRealtime.module';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
    }),
    UsersModule,
    ChatRealtimeModule,
  ],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
