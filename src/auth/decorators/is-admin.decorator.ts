import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { findUserById } from '../../lib';

export const IsAdmin = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext): Promise<boolean> => {
    const request = ctx.switchToHttp().getRequest();

    const user = await findUserById(request.user.id);

    return user?.roles.some((role) => role.name === 'admin') ?? false;
  },
);
