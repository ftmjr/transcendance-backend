import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoginModule } from './login/login.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import {UsersController} from "./users/users.controller";
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
    }),
    LoginModule,
    PrismaModule,
    UsersModule],
  controllers: [AppController, UsersController],
  providers: [AppService],
})
export class AppModule {}
