import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AppErrorCodes } from '../../types/error-codes';
import { SessionService } from '../../data-base/query/session/session.service';
import { SessionSchema } from '../../generated/zod';
import z from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * JWT認証されたセッション情報を取得するデコレーター
 *
 * 使用方法:
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get()
 * someEndpoint(@AuthSession() session: PublicSession) {
 *   return session;
 * }
 * ```
 */

export const publicSessionSchema = SessionSchema.extend({
  createdAt: z.union([z.string(), z.any()]),
  updatedAt: z.union([z.string(), z.any()]),
});

export class PublicSession extends createZodDto(publicSessionSchema) {}

export const AuthSession = createParamDecorator(
  async (
    data: unknown,
    ctx: ExecutionContext,
  ): Promise<PublicSession | null> => {
    const request = ctx.switchToHttp().getRequest();

    if (!request || !request.sessionId) {
      throw AppErrorCodes.UNAUTHORIZED;
    }

    const mr: ModuleRef | undefined = (global as any).__authModuleRef;
    if (!mr) {
      throw AppErrorCodes.UNAUTHORIZED;
    }

    const sessionService = mr.get(SessionService, { strict: false });
    if (!sessionService) {
      throw AppErrorCodes.UNAUTHORIZED;
    }

    const session = await sessionService.findById(request.sessionId);
    if (!session) {
      throw AppErrorCodes.NOT_FOUND;
    }

    const {
      success,
      error,
      data: publicSession,
    } = publicSessionSchema.safeParse(session);
    if (!success) {
      throw AppErrorCodes.INTERNAL_SERVER_ERROR.setCustomMessage(
        JSON.stringify(error.issues),
      );
    }

    return publicSession;
  },
);
