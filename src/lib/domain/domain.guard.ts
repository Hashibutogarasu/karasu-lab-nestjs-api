import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { DomainService } from './domain.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    sub?: string;
    email?: string;
    username?: string;
    [key: string]: any;
  };
}

@Injectable()
export class DomainGuard implements CanActivate {
  constructor(
    private readonly domainService: DomainService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // ユーザー情報の存在確認
    if (!request.user) {
      throw new UnauthorizedException(
        'User must be authenticated to access this resource',
      );
    }

    // メールアドレスの存在確認
    const email = request.user.email;
    if (!email) {
      throw new ForbiddenException(
        'User email is required for domain validation',
      );
    }

    // ドメインチェック
    const isDomainAllowed = this.domainService.isDomainAllowed(email);
    if (!isDomainAllowed) {
      const userDomain = this.domainService.extractDomain(email);
      throw new ForbiddenException(`Domain '${userDomain}' is not allowed.`);
    }

    return true;
  }
}
