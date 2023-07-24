import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiProperty,
} from '@nestjs/swagger';
import { AuthenticatedGuard } from '../auth/guards';

@ApiTags('UserActions')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiBearerAuth()
  // @UseGuards(AuthenticatedGuard)
  @Get()
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
  // @ApiBearerAuth()
  // // @UseGuards(AuthenticatedGuard)
  // @Get('addContact/:id')
  // @ApiOperation({
  //   summary: 'Send a contact request',
  // })
  // @ApiResponse({ status: 200, description: 'return Invitation pending' })
  // addContact(@Param('id') id: number) {
  //   return this.usersService.addContact(id);
  // }
}
