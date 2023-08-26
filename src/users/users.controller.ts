import {
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
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
  getUsers(@Request() req, @Query() queryParams: PaginationQuery) {
    const skip: number = parseInt(queryParams.skip);
    const take: number = parseInt(queryParams.take);
    const id: number = req.user.id;
    return this.usersService.getUsers(
      {
        skip,
        take,
        include: { profile: true, sessions: false, gameHistories: true },
        where: {
          OR: [
            { blockedUsers: { none: { blockedUserId: id } } }, // Users who have blocked the current user
            { blockedFrom: { none: { userId: id } } }, // Users who are blocked by the current user
          ],
        },
      },
      req.user,
    );
  }
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Get('all')
  @ApiOperation({
    summary: 'get all users',
    description: `
      - fetch all users from the database
    `,
  })
  @ApiResponse({ status: 200, description: 'return an array of users' })
  getAllUsers(@Request() req, @Query() queryParams: PaginationQuery) {
    const skip: number = parseInt(queryParams.skip);
    const take: number = parseInt(queryParams.take);
    return this.usersService.getAllUsers(
      {
        skip,
        take,
        include: { profile: true, sessions: false, gameHistories: true },
      },
    );
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
  @Post('username/:username')
  @ApiOperation({
    summary: 'update a user username',
    description: `
      -tries to update the username
    `,
  })
  @ApiResponse({ status: 200, description: 'return  the updated user' })
  updateUsername(@Request() req, @Param('username') username: string) {
    if (username.startsWith('42-')) {
      throw new ConflictException('Username starting with 42- not allowed!');
    }
    return this.usersService.updateUser({
      where: {
        id: req.user.id,
      },
      data: {
        username: username,
      },
    });
  }
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @Get('leaderboard')
  @ApiOperation({
    summary: 'Get users ordered by game wins',
  })
  @ApiResponse({ status: 200, description: 'return the users leaderboard' })
  async getUsersOrderedByWins() {
    return await this.usersService.getUsersOrderedByWins();
  }
}
