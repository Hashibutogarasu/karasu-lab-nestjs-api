import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AppErrorCodes } from '../types/error-codes';
import { UserService } from '../data-base/query/user/user.service';
import { JwtTokenService } from './jwt-token/jwt-token.service';
import { SessionService } from '../data-base/query/session/session.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly userService: UserService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly sessionService: SessionService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw AppErrorCodes.UNAUTHORIZED;
    }

    try {
      const result = await this.jwtTokenService.verifyJWTToken(token);
      if (
        !result.success ||
        !result.payload ||
        !result.payload.sub ||
        !result.payload.jti
      ) {
        throw AppErrorCodes.INVALID_TOKEN;
      }

      if (!(await this.userService.exists(result.payload.sub))) {
        throw AppErrorCodes.USER_NOT_FOUND;
      }

      const user = await this.userService.findById(result.payload.sub);
      const session = await this.sessionService.findByJti(result.payload.jti);

      if (!session) {
        throw AppErrorCodes.INVALID_SESSION;
      }

      request.user = user;
      request.sessionId = session.id;
      return true;
    } catch (err) {
      throw AppErrorCodes.INVALID_TOKEN;
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
