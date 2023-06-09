import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, SignupDto } from './dto';
import { Request, Response } from 'express';
import * as argon from 'argon2';
import { Tokens, ILoginData } from './interfaces';
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

  async signUpLocal(
    req: Request,
    res: Response,
    signUpDto: SignupDto,
  ): Promise<ILoginData> {
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
        expiresAt: new Date(), // expired immediately, if refresh not working
      });
      const tokens = await this.getTokens(user.email, user.id, session.id);
      await this.refreshSession(session.id, tokens.refreshToken, res);
      return {
        accessToken: tokens.accessToken,
        user,
      };
    } catch (err) {
      if (err?.code === 'P2002' && err?.meta?.target) {
        throw new ForbiddenException(`${err.meta?.target} already exists`);
      } else {
        throw err;
      }
    }
  }

  async signUpWithOauth(
    req: Request,
    res: Response,
    profileFetched: any,
  ): Promise<ILoginData> {
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
        expiresAt: new Date(), // expired immediately, if refresh not working
      });
      const tokens = await this.getTokens(user.email, user.id, session.id);
      await this.refreshSession(session.id, tokens.refreshToken, res);
      const userWithoutPassword = this.usersService.removePassword(user);
      return {
        accessToken: tokens.accessToken,
        user: userWithoutPassword,
      };
    } catch (err) {
      if (err?.code === 'P2002' && err?.meta?.target) {
        throw new ForbiddenException(`${err.meta?.target} already exists`);
      } else {
        throw err;
      }
    }
  }

  async signInLocalUser(
    req: Request,
    res: Response,
    loginDto: LoginDto,
  ): Promise<ILoginData> {
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
      expiresAt: new Date(),
    });
    const tokens = await this.getTokens(user.email, user.id, session.id);
    await this.refreshSession(session.id, tokens.refreshToken, res);
    const userWithoutPassword = this.usersService.removePassword(user);
    return {
      accessToken: tokens.accessToken,
      user: userWithoutPassword,
    };
  }

  async signInWithOauth(
    req: Request,
    res: Response,
    profileFetched: any,
  ): Promise<Tokens> {
    throw new Error('Method not implemented.');
  }

  async logOut(refreshToken: string, res: Response) {
    try {
      const isValid = this.jwtService.verify(refreshToken) as JwtPayload;
      if (!isValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
      const { sessionId } = isValid.sub;
      await this.destroySession(sessionId);
      this.destroyCookieForRefreshToken(res);
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
    refreshToken: string,
    res: Response,
  ): Promise<{ accessToken: string }> {
    const isValid = this.jwtService.verify(refreshToken) as JwtPayload;
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const { userId, sessionId } = isValid.sub;
    const user = await this.usersService.getUser({ id: userId });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const session = await this.usersService.getSessionById(sessionId);
    if (!session) {
      throw new UnauthorizedException('Invalid credentials, no session found');
    }
    const tokens = await this.getTokens(user.email, user.id, session.id);
    await this.refreshSession(session.id, tokens.refreshToken, res);
    return {
      accessToken: tokens.accessToken,
    };
  }

  async getUserFromJwt(userId: number, sessionId: number): Promise<User> {
    const user = await this.usersService.getUser({ id: userId });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async refreshSession(sessionId: number, refreshToken: string, res: Response) {
    const data = this.jwtService.decode(refreshToken);
    const expiresAt = new Date((data as any).exp * 1000);
    await this.usersService.updateSession(sessionId, refreshToken, expiresAt);
    this.setCookieForRefreshToken(refreshToken, res);
  }

  async destroySession(sessionId: number) {
    await this.usersService.deleteSession({ id: sessionId });
  }

  setCookieForRefreshToken(refreshToken: string, res: Response) {
    res.cookie('REFRESH_TOKEN', refreshToken, {
      httpOnly: true,
    });
  }

  destroyCookieForRefreshToken(res: Response) {
    res.cookie('REFRESH_TOKEN', '', {
      httpOnly: true,
      expires: new Date(0),
    });
  }

  // build tokens and return them as a promise
  async getTokens(
    email: string,
    userId: number,
    sessionId: number,
  ): Promise<Tokens> {
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
