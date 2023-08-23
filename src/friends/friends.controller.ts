import {Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request} from '@nestjs/common';
import { FriendsService } from './friends.service';
import {ApiBearerAuth, ApiOperation} from "@nestjs/swagger";
import {AuthenticatedGuard} from "../auth/guards";
import {UsersService} from "../users/users.service";

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Get()
  @ApiOperation({
    summary: 'Retrieve all friends of connected user',
  })
  async getFriends(@Request() req) {
    return await this.friendsService.getFriends(req.user.id);
  }
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Get('sent')
  @ApiOperation({
    summary: 'Retrieve all sent friends requests',
  })
  async getSentFriendRequests(@Request() req) {
    return await this.friendsService.getSentFriendRequests(req.user.id);
  }
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Get('received')
  @ApiOperation({
    summary: 'Retrieve all received friends requests',
  })
  async getReceivedFriendRequests(@Request() req) {
    return await this.friendsService.getReceivedFriendRequests(req.user.id);
  }
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Delete(':id')
  @ApiOperation({
    summary: 'Remove a friend',
  })
  async removeFriend(@Request() req, @Param('id') id: string) {
    const friendId = parseInt(id);
    return await this.friendsService.removeFriend(req.user.id, friendId);
  }
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Post(':id')
  @ApiOperation({
    summary: 'send a friend request',
  })
  async addFriendRequest(@Request() req, @Param('id') id: string) {
    const friendId = parseInt(id);
    return await this.friendsService.addFriendRequest(req.user.id, friendId);
  }
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Delete('sent/:id')
  @ApiOperation({
    summary: 'Cancel a friend request',
  })
  async cancelFriendRequest(@Request() req, @Param('id') id: string) {
    const requestId = parseInt(id);
    return await this.friendsService.cancelFriendRequest(requestId);
  }
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Post('approve/:id')
  @ApiOperation({
    summary: 'Approve a friend request',
  })
  async approveFriendRequest(@Request() req, @Param('id') id: string) {
    const requestId = parseInt(id);
    return await this.friendsService.approveFriendRequest(requestId);
  }
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Post('reject/:id')
  @ApiOperation({
    summary: 'Reject a friend request',
  })
  async rejectFriendRequest(@Request() req, @Param('id') id: string) {
    const requestId = parseInt(id);
    return await this.friendsService.rejectFriendRequest(requestId);
  }
}