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
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET!,
      });

      request.user = payload;
    } catch (err) {
      throw AppErrorCodes.INVALID_TOKEN;
    }

    return super.canActivate(context);
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
