import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { ModuleRef } from '@nestjs/core';
import { AppErrorCodes } from '../../types/error-codes';
import { UserService } from '../../data-base/query/user/user.service';
import { UserSchema } from '../../generated/zod';
import z from 'zod';
import { createZodDto } from 'nestjs-zod';

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
  include: { roles: true; extraProfiles: true; providers: string[] };
}> & { roles: Role[] };

export const publicUserSchema = UserSchema.omit({
  passwordHash: true,
}).extend({
  createdAt: z.union([z.string(), z.any()]),
  updatedAt: z.union([z.string(), z.any()]),
});

export class PublicUser extends createZodDto(publicUserSchema) {}

export const AuthUser = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext): Promise<PublicUser | null> => {
    const request = ctx.switchToHttp().getRequest();

    if (!request || !request.user || !request.user.id) {
      throw AppErrorCodes.UNAUTHORIZED;
    }

    const mr: ModuleRef | undefined = (global as any).__authModuleRef;
    if (!mr) {
      throw AppErrorCodes.UNAUTHORIZED;
    }

    // get by provider token name to avoid static import
    const userService = mr.get(UserService, { strict: false });
    if (!userService) {
      throw AppErrorCodes.UNAUTHORIZED;
    }

    const user = await userService.findUserById(request.user.id);
    if (!user) {
      throw AppErrorCodes.NOT_FOUND;
    }

    const {
      success,
      error,
      data: publicUser,
    } = publicUserSchema.safeParse(user);
    if (!success) {
      throw AppErrorCodes.INTERNAL_SERVER_ERROR.setCustomMessage(
        JSON.stringify(error.issues),
      );
    }

    return publicUser;
  },
);

export const setAuthUserModuleRef = (mr: ModuleRef) => {
  (global as any).__authModuleRef = mr;
};
