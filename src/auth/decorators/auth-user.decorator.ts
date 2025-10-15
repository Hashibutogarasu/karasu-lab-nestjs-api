import { User } from '@prisma/client';
import { findUserByIdWithoutPassword } from '../../lib';
import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AppErrorCodes } from '../../types/error-codes';

/**
 * JWT認証されたユーザー情報を取得するデコレーター
 *
 * 使用方法:
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get()
 * getUserProfile(@AuthUser() user: User) {
 *   return user;
 * }
 * ```
 */
export const AuthUser = createParamDecorator(
  async (
    data: unknown,
    ctx: ExecutionContext,
  ): Promise<Omit<User, 'passwordHash'> | null> => {
    const request = ctx.switchToHttp().getRequest();
    const user = await findUserByIdWithoutPassword(request.user.id);
    if (!user) {
      throw AppErrorCodes.UNAUTHORIZED;
    }
    return user;
  },
);
