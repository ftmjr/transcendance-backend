import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { AuthService, JwtPayload } from '../auth.service';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class JtwStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'testing',
      ignoreExpiration: false,
    });
  }

  // called when user is already logged, and we want to get his data
  async validate(payload: JwtPayload) {
    const { userId, sessionId } = payload.sub;
    const user = await this.authService.getUSerFromJwt(userId, sessionId);
    return user;
  }
}

export interface JwtRefreshPayload extends JwtPayload {
  refreshToken: string;
}
@Injectable()
export class JtwRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'testing',
      ignoreExpiration: true,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const refreshToken = req.get('Authorization').replace('Bearer ', '').trim();
    return { ...payload, refreshToken } as JwtRefreshPayload;
  }
}
