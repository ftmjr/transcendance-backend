import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { UsersModule } from '../users/users.module';

@Module({
  controllers: [FilesController],
  providers: [FilesService],
  imports: [
    MulterModule.register({
      dest: './uploads',
    }),
    UsersModule,
  ],
})
export class FilesModule {}
