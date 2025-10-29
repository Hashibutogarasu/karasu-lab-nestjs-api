import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { AppErrorCodes } from '../types/error-codes';
import { EncryptionService } from '../encryption/encryption.service';

export interface JwtPayload {
  id: string; // jwt state id
  sub: string; // user ID
  username: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private encryptionService: EncryptionService;

  constructor(
    private authService: AuthService,
    encryptionService: EncryptionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: (_req, rawJwtToken, done) => {
        try {
          const key = encryptionService.getPublicKeyPem();
          done(null, key);
        } catch (err) {
          done(err as Error, undefined);
        }
      },
      algorithms: ['RS256'],
    });

    this.encryptionService = encryptionService;
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
