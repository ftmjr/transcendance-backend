import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() data: CreateUserDto) {
    const { name, email } = data;
    return this.usersService.createUser({
      name,
      email,
    });
  }
  @Get()
  getUsers() {
      return this.usersService.getUsers();
  }
}
