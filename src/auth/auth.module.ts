import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JtwStrategy } from './strategies';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: 'testing', // TODO: change this to a real secret key
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JtwStrategy],
})
export class AuthModule {}
