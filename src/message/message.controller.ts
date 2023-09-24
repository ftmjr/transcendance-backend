import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto';
import { PrivateMessage } from '@prisma/client';
import { AuthenticatedGuard } from '../auth/guards';
import { UserWithoutSensitiveInfo } from '../users/users.service';

@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @UseGuards(AuthenticatedGuard)
  @Post()
  async createPrivateMessage(
    @Body() createMessageDto: CreateMessageDto,
    @Req() req: any,
  ): Promise<PrivateMessage> {
    return this.messageService.createPrivateMessage(createMessageDto, req.user);
  }

  @UseGuards(AuthenticatedGuard)
  @Get('private/:userTwoId')
  async getPrivateMessages(
    @Param('userTwoId') userTwoId: number,
    @Query('skip') skip: number,
    @Query('take') take: number,
    @Req() req: any,
  ): Promise<PrivateMessage[]> {
    return this.messageService.getPrivateMessages(req.user.id, userTwoId, {
      skip,
      take,
    });
  }

  @UseGuards(AuthenticatedGuard)
  @Get('conversations')
  async getUniqueConversations(
    @Req() req: any,
  ): Promise<UserWithoutSensitiveInfo[]> {
    return this.messageService.getUniqueConversations(req.user.id);
  }
}
