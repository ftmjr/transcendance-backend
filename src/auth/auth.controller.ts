import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Response,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, JwtPayload } from './auth.service';
import { LoginDto, SignupDto } from './dto';
import { Tokens, ILoginData } from './interfaces';
import { JwtService } from '@nestjs/jwt';
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
      - send access token and user info: { accessToken, user }
      - If the user is not found, will return a 401 status code
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'return the jwt access token and user',
  })
  async login(
    @Request() req,
    @Response({ passthrough: true }) res,
    @Body() loginDto: LoginDto,
  ): Promise<ILoginData> {
    return this.authService.signInLocalUser(req, res, loginDto);
  }

  @Post('signup')
  @ApiOperation({
    summary: 'create an account',
    description: `
      - send access token, and user info: { accessToken, user }
      - create a new user in the database
      - create a new session in the database
      - if the user already exists, will return a 403 status code
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'return the jwt access token and user data',
  })
  async signup(
    @Request() req,
    @Response({ passthrough: true }) res,
    @Body() signUpDto: SignupDto,
  ): Promise<ILoginData> {
    return this.authService.signUpLocal(req, res, signUpDto);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'refresh access token',
    description: `
      - send a string of the new access token
      - update the database with the new refresh token and the cookie
      - it use the refresh token in the cookies to get the session
      - if the refresh token in cookies is invalid, will return a 401 status code
    `,
  })
  @ApiResponse({ status: 200, description: 'return the access token' })
  async refresh(
    @Request() req,
    @Response({ passthrough: true }) res,
  ): Promise<{ accessToken: string }> {
    const refreshToken = req.cookies['REFRESH_TOKEN'] ?? '';
    return this.authService.refreshAccessToken(refreshToken, res);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @ApiOperation({
    summary: 'logout the user and destroy session',
    description: `
      - use access token, check in the cookies for the refresh token
      - will destroy the session and return a 200 status code
      - if the token is valid, but the session is not found, will return a 401 status code
    `,
  })
  @ApiResponse({ status: 200, description: 'logout successful' })
  async logout(
    @Request() req,
    @Response({ passthrough: true }) res,
  ): Promise<{ message: string }> {
    const refreshToken = req.cookies['REFRESH_TOKEN'] ?? '';
    return this.authService.logOut(refreshToken, res);
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
