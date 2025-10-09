import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { findUserById } from '../../lib';

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
      throw new ForbiddenException('User not found');
    }

    if (dbUser?.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
