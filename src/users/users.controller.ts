import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'get all users',
    description: `
      - fetch all users from the database
    `,
  })
  @ApiResponse({ status: 200, description: 'return an array of users' })
  getUsers() {
    return this.usersService.getUsers();
  }
}
