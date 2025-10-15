import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { findUserById } from '../../lib';

/**
 * JWT認証されたユーザー情報を取得するデコレーター
 *
 * 使用方法:
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get()
 * getUserProfile(@AuthUser() user: UserWithRelations) {
 *   return user;
 * }
 * ```
 */

export type UserWithRelations = Prisma.UserGetPayload<{
  include: { roles: true; extraProfiles: true };
}> & { roles: Role[] };

export type PublicUser = Omit<UserWithRelations, 'passwordHash'>;

export const AuthUser = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext): Promise<PublicUser | null> => {
    const request = ctx.switchToHttp().getRequest();

    if (!request || !request.user || !request.user.id) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    const user = await findUserById(request.user.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { passwordHash, ...publicUser } = user as UserWithRelations;
    return publicUser as PublicUser;
  },
);
