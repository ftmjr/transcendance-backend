import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedGuard } from '../auth/guards';
import { PaginationQuery } from './dto/pagination-query.dto';

@ApiTags('UserActions')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Get()
  @ApiOperation({
    summary: 'get all users',
    description: `
      - fetch all users from the database
    `,
  })
  @ApiResponse({ status: 200, description: 'return an array of users' })
  getUsers(@Query() queryParams: PaginationQuery) {
    const skip: number = parseInt(queryParams.skip);
    const take: number = parseInt(queryParams.take);
    return this.usersService.getUsers({
      skip,
      take,
      include: { profile: true, sessions: false, gameHistories: true },
      where: {
        blockedFrom: { none: {} },
        blockedUsers: { none: {} },
      },
    });
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Get('block')
  @ApiOperation({
    summary: 'get all blocked users',
    description: `
      - fetch all blocked users from the database
    `,
  })
  @ApiResponse({ status: 200, description: 'return an array of blocked users' })
  async getBlockedUsers(@Request() req) {
    return await this.usersService.getBlockedUsers(req.user.id);
  }
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Post('block/:id')
  @ApiOperation({
    summary: 'block a user',
    description: `
      - block a user
    `,
  })
  @ApiResponse({ status: 200, description: 'return the blocked user' })
  async blockUser(@Request() req, @Param('id') id: string) {
    const blockUserId: number = parseInt(id);
    return await this.usersService.blockUser(req.user.id, blockUserId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Delete('block/:id')
  @ApiOperation({
    summary: 'remove a user from blocked users',
    description: `
      - remove a user from the blocked list
    `,
  })
  @ApiResponse({ status: 200, description: 'return  the unblocked user' })
  unblockUser(@Request() req, @Param('id') id: string) {
    const blockUserId: number = parseInt(id);
    return this.usersService.unblockUser(req.user.id, blockUserId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Get('friends')
  @ApiOperation({
    summary: 'Retrieve all friends of connected user',
  })
  getFriends(@Request() req) {
    return this.usersService.getFriends(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Post('friends/:id')
  @ApiOperation({
    summary: 'Approve a friend request from user id',
  })
  approveRequest(@Request() req, @Param('id') id: string) {
    const friendId = parseInt(id);
    return this.usersService.addFriend(req.user.id, friendId);
  }
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Delete('friends/remove/:id')
  @ApiOperation({
    summary: 'Delete a friend from contact list',
  })
  removeFriend(@Request() req, @Param('id') id: string) {
    const friendId = parseInt(id);
    return this.usersService.removeFriend(req.user.id, friendId);
  }
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Post('friends/add/:id')
  @ApiOperation({
    summary: 'Send a friend request to user id',
  })
  sendFriendRequest(@Request() req, @Param('id') id: string) {
    const friendId = parseInt(id);
    return this.usersService.sendFriendRequest(req.user.id, friendId);
  }
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Get('friends/add')
  @ApiOperation({
    summary: 'List all friend requests sent',
  })
  sentFriendRequests(@Request() req) {
    return this.usersService.allSentFriendRequests(req.user.id);
  }
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Get('friends/requests')
  @ApiOperation({
    summary: 'List all friend requests received',
  })
  receivedFriendRequests(@Request() req) {
    return this.usersService.receivedFriendRequests(req.user.id);
  }
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Delete('friends/add/:id')
  @ApiOperation({
    summary: 'Cancel sent request from request id',
  })
  cancelFriendRequest(@Param('id') id: string) {
    const requestId = parseInt(id);
    return this.usersService.cancelFriendRequest(requestId);
  }
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Post('friends/approve/:id')
  @ApiOperation({
    summary: 'Respond to request from request id',
  })
  approveFriendRequest(@Request() req, @Param('id') id: string) {
    const requestId = parseInt(id);
    return this.usersService.approveFriendRequest(requestId);
  }
}
