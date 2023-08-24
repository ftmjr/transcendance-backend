import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator, Req, Delete,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { AuthenticatedGuard } from '../auth/guards';
import { ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path'; // Import the extname function
import { User } from "@prisma/client";
import * as express from 'express';
import {UsersService} from "../users/users.service";

type RequestWithUser = express.Request & { user: User };
@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private usersService: UsersService,
  ) {}

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
          callback(
            null,
            requestWithUser.user.id +
              '-' +
              requestWithUser.user.username +
              '-' +
              file.originalname +
              extension,
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
  async local(
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const serverBaseUrl = 'https://' + process.env.URL + '/api';
    const fileUrl = `${serverBaseUrl}/${file.filename}`;
    await this.usersService.updateProfile({
      where: {
        userId: req.user.id,
      },
      data: {
        avatar: fileUrl,
      },
    });
    return {
      statusCode: 200,
      data: fileUrl,
    };
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Delete('avatar')
  async randomizeAvatar(@Req() req) {
    await this.usersService.updateProfile({
      where: {
        userId: req.user.id,
      },
      data: {
        avatar: this.filesService.getRandomAvatarUrl(),
      },
    });
  }
}
