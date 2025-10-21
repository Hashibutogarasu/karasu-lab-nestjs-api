import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserService } from '../../data-base/query/user/user.service';
import { ModuleRef } from '@nestjs/core';

let _moduleRef: ModuleRef | null = null;
export const setIsAdminModuleRef = (mr: ModuleRef) => {
  _moduleRef = mr;
};

export const IsAdmin = createParamDecorator(
  async (_: unknown, ctx: ExecutionContext): Promise<boolean> => {
    const request = ctx.switchToHttp().getRequest();
    if (!request || !request.user || !request.user.id) return false;

    const mr = _moduleRef;
    if (!mr) return false;

    const userService = mr.get(UserService, { strict: false });
    if (!userService) return false;

    const user = await userService.findUserById(request.user.id);
    return (
      user?.roles?.some((role: { name: string }) => role.name === 'admin') ??
      false
    );
  },
);
