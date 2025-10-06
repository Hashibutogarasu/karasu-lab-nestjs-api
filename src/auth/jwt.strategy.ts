import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

export interface JwtPayload {
  sub: string; // user ID
  username: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.getUserProfileById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && now > payload.exp) {
      throw new UnauthorizedException('Token has expired');
    }

    return { ...user, id: payload.sub };
  }
}
