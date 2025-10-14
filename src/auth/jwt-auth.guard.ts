import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { AppErrorCodes } from '../types/error-codes';
import { verifyJWTToken } from '../lib/auth/jwt-token';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private jwtService: JwtService) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw AppErrorCodes.UNAUTHORIZED;
    }

    try {
      return (async () => {
        const result = await verifyJWTToken(token);
        if (!result.success || !result.payload) {
          throw AppErrorCodes.INVALID_TOKEN;
        }
        // Attach minimal user context (id only).
        request.user = { id: result.payload.sub };
        return super.canActivate(context) as Promise<boolean>;
      })();
    } catch (err) {
      throw AppErrorCodes.INVALID_TOKEN;
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
