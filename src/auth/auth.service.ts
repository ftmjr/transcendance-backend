import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, SignupDto } from './dto';
import { Request } from 'express';
import * as argon from 'argon2';
import { Tokens } from './interfaces';
import { UsersService } from '../users/users.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { User } from '@prisma/client';
export interface JwtPayload {
  email: string;
  sub: {
    userId: number;
    sessionId: number;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async signUpLocal(req: Request, signUpDto: SignupDto): Promise<Tokens> {
    try {
      const { email, password, username } = signUpDto;
      const { ip, userAgent } = this.getRequestInfo(req);
      const user = await this.usersService.createUser({
        username,
        email,
        password: password, // will be hashed in the service layer
      });
      const session = await this.usersService.createSession({
        user,
        token: 'jwt-local-token',
        ipAddress: ip,
        userAgent: userAgent,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days max
      });
      const tokens = await this.getTokens(user.email, user.id, session.id);
      await this.refreshSession(session.id, tokens.refreshToken);
      return tokens;
    } catch (err) {
      if (err?.code === 'P2002' && err?.meta?.target) {
        throw new ForbiddenException(`${err.meta?.target} already exists`);
      } else {
        throw err;
      }
    }
  }

  async signUpWithOauth(req: Request, profileFetched: any): Promise<Tokens> {
    try {
      const { email, username } = profileFetched;
      const { ip, userAgent } = this.getRequestInfo(req);
      const hashedPassword = await argon.hash('oauth');
      const user = await this.usersService.createUser({
        username,
        email,
        password: hashedPassword, // not possible to log with a password with OAuth
      });
      const session = await this.usersService.createSession({
        user,
        token: 'jwt-oauth-token',
        ipAddress: ip,
        userAgent: userAgent,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days max
      });
      const tokens = await this.getTokens(user.email, user.id, session.id);
      await this.refreshSession(session.id, tokens.refreshToken);
      return tokens;
    } catch (err) {
      if (err?.code === 'P2002' && err?.meta?.target) {
        throw new ForbiddenException(`${err.meta?.target} already exists`);
      } else {
        throw err;
      }
    }
  }

  async signInLocalUser(req: Request, loginDto: LoginDto): Promise<Tokens> {
    const user = await this.usersService.getUserByUsername(loginDto.username);
    const { ip, userAgent } = this.getRequestInfo(req);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isValid = await argon.verify(user.password, loginDto.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials, wrong password');
    }
    const session = await this.usersService.createSession({
      user,
      token: 'jwt-signIn-token',
      ipAddress: ip,
      userAgent: userAgent,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    });
    const tokens = await this.getTokens(user.email, user.id, session.id);
    await this.refreshSession(session.id, tokens.refreshToken);
    return tokens;
  }

  async signInWithOauth(req: Request, profileFetched: any): Promise<Tokens> {
    throw new Error('Method not implemented.');
  }

  async logOut(sessionId: number) {
    try {
      await this.destroySession(sessionId);
      return {
        message: 'Successfully logged out, bye bye',
      };
    } catch (err) {
      if (err?.code === 'P2025') {
        throw new UnauthorizedException('Invalid credentials');
      } else {
        throw err;
      }
    }
  }

  async refreshAccessToken(
    userId: number,
    sessionId: number,
    refreshToken: string,
  ) {
    const user = await this.usersService.getUser({ id: userId });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const session = await this.usersService.getSessionById(sessionId);
    if (!session) {
      throw new UnauthorizedException('Invalid credentials, no session found');
    }
    const isValid = this.jwtService.verify(refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const tokens = await this.getTokens(user.email, user.id, session.id);
    await this.refreshSession(session.id, tokens.refreshToken);
    return tokens;
  }

  async getUSerFromJwt(userId: number, sessionId: number): Promise<User> {
    const user = await this.usersService.getUser({ id: userId });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async refreshSession(sessionId: number, refreshToken: string) {
    const data = this.jwtService.decode(refreshToken);
    const expiresAt = new Date((data as any).exp * 1000);
    await this.usersService.updateSession(sessionId, refreshToken, expiresAt);
  }

  async destroySession(sessionId: number) {
    await this.usersService.deleteSession({ id: sessionId });
  }

  // build tokens and return them as a promise
  async getTokens(
    email: string,
    userId: number,
    sessionId: number,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      email: email,
      sub: {
        userId: userId,
        sessionId: sessionId,
      },
    };
    const tokens = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: 60 * 5 }), // 5 minutes
      this.jwtService.signAsync(payload, { expiresIn: '7d' }), // 7 days
    ]);

    return {
      accessToken: tokens[0],
      refreshToken: tokens[1],
    };
  }

  getRequestInfo(req: Request) {
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return {
      ip,
      userAgent,
    };
  }
}
