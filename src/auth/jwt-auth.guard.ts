import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AppErrorCodes } from '../types/error-codes';
import { verifyJWTToken } from '../lib/auth/jwt-token';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
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
      const result = await verifyJWTToken(token);
      if (!result.success || !result.payload) {
        throw AppErrorCodes.INVALID_TOKEN;
      }

      if (!(await this.usersService.exists(result.payload.sub))) {
        throw AppErrorCodes.USER_NOT_FOUND;
      }

      request.user = { id: result.payload.sub };
      return super.canActivate(context) as Promise<boolean>;
    } catch (err) {
      throw AppErrorCodes.INVALID_TOKEN;
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
