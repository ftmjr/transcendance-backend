import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { AuthService, JwtPayload } from '../auth.service';
import { Injectable } from '@nestjs/common';

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
    const user = await this.authService.getUserFromJwt(userId, sessionId);
    return user;
  }
}
