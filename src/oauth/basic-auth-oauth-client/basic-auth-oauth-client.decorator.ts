import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { OAuthClient } from '@prisma/client';
import { AppErrorCodes } from '../../types/error-codes';

export const BasicAuthOauthClient = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Partial<OAuthClient> | undefined => {
    const req = ctx.switchToHttp().getRequest() as Express.Request;
    const client = req?.client as OAuthClient | undefined;
    if (!client) {
      throw AppErrorCodes.INVALID_CLIENT;
    }
    return {
      id: client.id,
      name: client.name,
      redirectUris: client.redirectUris,
      permissionBitMask: client.permissionBitMask, // Required for scope calculations
    };
  },
);

export default BasicAuthOauthClient;
