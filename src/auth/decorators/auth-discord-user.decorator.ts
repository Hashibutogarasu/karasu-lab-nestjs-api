import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { UtilityService } from '../../data-base/utility/utility.service';
import { DiscordUserSchema } from '../../types/discord-user';

let _authProfileModuleRef: ModuleRef | null = null;
export const setAuthDiscordProfileModuleRef = (mr: ModuleRef) => {
  _authProfileModuleRef = mr;
};

/**
 * Discord ユーザーデコレーター
 * UtilityService.getAuthenticatedUserProfile を使って ExtraProfile を取得しパースする
 */
export const AuthDiscordUser = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    const mr = _authProfileModuleRef;
    if (!mr) return null;

    const utilityService = mr.get(UtilityService, { strict: false });
    if (!utilityService) return null;

    return utilityService.getAuthenticatedUserProfile(
      ctx,
      'discord',
      (rawProfile: any) => DiscordUserSchema.parse(rawProfile),
    );
  },
);
