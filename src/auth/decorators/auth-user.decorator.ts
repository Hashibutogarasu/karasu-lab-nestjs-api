import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { findUserByIdWithoutPassword } from '../../lib';

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
      throw new UnauthorizedException('User not found');
    }
    return user;
  },
);
