import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { AppErrorCodes } from '../types/error-codes';

export interface JwtPayload {
  id: string; // jwt state id
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
    const revoked = await this.authService.isJWTStateRevoked(payload);

    if (revoked) {
      throw AppErrorCodes.REVOKED_TOKEN;
    }

    const user = await this.authService.getUserProfileById(payload.sub);
    if (!user) {
      throw AppErrorCodes.INVALID_TOKEN;
    }

    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && now > payload.exp) {
      throw AppErrorCodes.EXPIRED_TOKEN;
    }

    return { ...user, id: payload.sub };
  }
}
