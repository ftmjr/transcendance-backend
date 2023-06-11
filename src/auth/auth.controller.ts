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
import { AuthService } from './auth.service';
import { LoginDataDto, LoginDto, RefreshDataDto, SignupDto } from './dto';
import { ILoginData } from './interfaces';
import { JwtService } from '@nestjs/jwt';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
    description: `
    - return the jwt access token and user data
    - create a new session in the database
    - create a new refresh token in the cookies
    `,
    type: LoginDataDto,
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
      - if the user already exists, will return a 403 status code
    `,
  })
  @ApiResponse({
    status: 200,
    description: `
    - return the jwt access token and user data
    - create a new session in the database
    - create a REFRESH_TOKEN in the cookies
    `,
    type: LoginDataDto,
  })
  async signup(
    @Request() req,
    @Response({ passthrough: true }) res,
    @Body() signUpDto: SignupDto,
  ): Promise<ILoginData> {
    return this.authService.signUpLocal(req, res, signUpDto);
  }

  @Post('refresh')
  @ApiCookieAuth('REFRESH_TOKEN')
  @ApiOperation({
    summary: 'refresh access token',
    description: `
      - send a string of the new access token
      - update the database session with the new refresh token and the cookie
      - it use the refresh token in the cookies to get the session
      - if the REFRESH_TOKEN in cookies is invalid, will return a 401
    `,
  })
  @ApiResponse({
    status: 200,
    type: RefreshDataDto,
    description: 'return the access token',
  })
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

  // Google auth
  @Get('google')
  @ApiOperation({
    summary: 'Google auth entry request route',
    description: 'Will make a call to google, and redirect',
  })
  @ApiResponse({
    status: 302,
    description: 'redirection to auth callback for google',
  })
  @UseGuards(AuthGuard('google'))
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  googleLogin() {}

  @Get('google/callback')
  @ApiOperation({
    summary: 'Google Auth callback route',
    description: `
      - Will receive tokens from google
      - Profile data will be load and user found or created
    `,
  })
  @ApiResponse({
    status: 200,
    description: `
    - return the jwt access token and user data
    - create a new session in the database
    - create a REFRESH_TOKEN in the cookies
    `,
    type: LoginDataDto,
  })
  @UseGuards(AuthGuard('google'))
  googleLoginCallback(
    @Request() req,
    @Response({ passthrough: true }) res,
  ): Promise<ILoginData> {
    return this.authService.signInWithOauth(req, res, req.user);
  }
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
