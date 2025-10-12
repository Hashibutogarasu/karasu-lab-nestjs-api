import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { findUserById } from '../../lib';
import { AppErrorCodes } from '../../types/error-codes';

/**
 * 管理者権限を持つユーザーのみ通過させるガード
 *
 * 使用前提: JwtAuthGuardが先に適用されている必要があります
 *
 * 使用方法:
 * ```typescript
 * @UseGuards(JwtAuthGuard, AdminGuard)
 * @Get('admin-only')
 * adminOnlyEndpoint(@AuthUser() user: User) {
 *   return { message: 'Admin access granted' };
 * }
 * ```
 */
@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    const dbUser = await findUserById(user.id);

    if (!dbUser) {
      throw AppErrorCodes.USER_NOT_FOUND;
    }

    if (dbUser?.role !== 'admin') {
      throw AppErrorCodes.FORBIDDEN;
    }

    return true;
  }
}
