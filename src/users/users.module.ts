import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import {UsersRepository} from "./users.repository";
import {UsersResolver} from "./users.resolver";

@Module({
  imports: [PrismaModule],
  providers: [UsersResolver, UsersRepository, UsersService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
