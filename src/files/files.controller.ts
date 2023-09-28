import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  Req,
  Delete,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { AuthenticatedGuard } from '../auth/guards';
import { ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path'; // Import the extname function
import { User } from '@prisma/client';
import * as express from 'express';
import { UsersService } from '../users/users.service';
import { ChatRealtimeService } from '../chatRealtime/chatRealtime.service';

type RequestWithUser = express.Request & { user: User };
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const requestWithUser = req as RequestWithUser;
          const extension = extname(file.originalname);
          //no more original name to avoid issues
          callback(
            null,
            `${requestWithUser.user.username}-avatar-${Date.now()}${extension}`,
          );
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return callback(new Error('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 1024 * 1024 * 4,
      },
    }),
  )
  async changeUserAvatar(
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.filesService.updateAvatarUrl(file.filename, req.user);
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Post('chatRoomAvatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/room',
        filename: (req, file, callback) => {
          const extension = extname(file.originalname);
          callback(null, `room-${Date.now()}-${extension}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return callback(new Error('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 1024 * 1024 * 4 },
    }),
  )
  async changeChatAvatar(
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('roomId') roomId: number,
  ) {
    return this.filesService.updateChatRoomAvatar(
      file.filename,
      roomId,
      req.user,
    );
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Delete('avatar')
  async randomizeAvatar(@Req() req: RequestWithUser) {
    return this.filesService.deleteCurrentUserAvatar(req.user);
  }
}
