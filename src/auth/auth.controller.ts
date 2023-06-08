import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, JwtPayload } from './auth.service';
import { LoginDto, SignupDto } from './dto';
import { Tokens } from './interfaces';
import { JwtService } from '@nestjs/jwt';
import { JwtRefreshPayload } from './strategies';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
  ) {}

  @Post('login')
  @ApiOperation({
    summary: 'login the user',
    description: `
      - send a new pair of access and refresh tokens: { accessToken, refreshToken }
      - If the user is not found, will return a 401 status code
    `,
  })
  @ApiResponse({ status: 200, description: 'return a pair of jwt token' })
  async login(@Request() req, @Body() loginDto: LoginDto): Promise<Tokens> {
    return this.authService.signInLocalUser(req, loginDto);
  }

  @Post('signup')
  @ApiOperation({
    summary: 'create an account',
    description: `
      - send a new pair of access and refresh tokens: { accessToken, refreshToken }
      - create a new user in the database
      - create a new session in the database
      - if the user already exists, will return a 403 status code
    `,
  })
  @ApiResponse({ status: 200, description: 'return a pair of jwt token' })
  async signup(@Request() req, @Body() signUpDto: SignupDto): Promise<Tokens> {
    return this.authService.signUpLocal(req, signUpDto);
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @ApiOperation({
    summary: 'refresh access token',
    description: `
      - send a new pair of access and refresh tokens
      - the refresh token 'refreshToken' needs to be sent in the Authorization header
      - update the database with the new refresh token
      - if the refresh token is invalid, will return a 401 status code
    `,
  })
  @ApiResponse({ status: 200, description: 'return new pair of jwt token' })
  async refresh(@Request() req): Promise<Tokens> {
    const payload = req.user as JwtRefreshPayload; // user here is different from jwt strategy
    const { userId, sessionId } = payload.sub;
    const refreshToken = payload.refreshToken;
    return this.authService.refreshAccessToken(userId, sessionId, refreshToken);
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('logout')
  @ApiOperation({
    summary: 'logout the user and destroy session',
    description: `
      - use the refresh token to invalidate the session
      - the refresh token 'refreshToken' needs to be sent in the Authorization header
      - will destroy the session and return a 200 status code
      - if the refresh token is invalid, will return a 401 status code
    `,
  })
  @ApiResponse({ status: 200, description: 'logout successful' })
  async logout(@Request() req): Promise<{ message: string }> {
    const payload = req.user as JwtRefreshPayload; // user here is different from jwt strategy
    const sessionId = payload.sub.sessionId;
    return this.authService.logOut(sessionId);
  }

  // // Google auth
  // @Get('google')
  // @UseGuards(AuthGuard('google'))
  // // eslint-disable-next-line @typescript-eslint/no-empty-function
  // googleLogin() {}
  //
  // @Get('google/callback')
  // @UseGuards(AuthGuard('google'))
  // googleLoginCallback(@Request() req) {
  //   return this.authService.signInWithOauth(req, req.user);
  // }
  //
  // // Facebook auth
  // @Get('facebook')
  // @UseGuards(AuthGuard('facebook'))
  // // eslint-disable-next-line @typescript-eslint/no-empty-function
  // facebookLogin() {}
  //
  // @Get('facebook/callback')
  // @UseGuards(AuthGuard('facebook'))
  // facebookLoginCallback(@Request() req) {
  //   return this.authService.signInWithOauth(req, req.user);
  // }
  //
  // // 42 auth
  // @Get('42')
  // @UseGuards(AuthGuard('42'))
  // // eslint-disable-next-line @typescript-eslint/no-empty-function
  // api42Login() {}
  //
  // @Get('42/callback')
  // @UseGuards(AuthGuard('42'))
  // api42LoginCallback(@Request() req) {
  //   return this.authService.signInWithOauth(req, req.user);
  // }
  //
  // // Two-factor auth
  // @Post('twofactor/verify')
  // async verifyTwoFactorAuth(@Request() req, @Body('token') token: string) {
  //   return this.authService.checkTwoFactor(req, req.user);
  // }
}
