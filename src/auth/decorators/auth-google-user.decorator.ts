import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { UtilityService } from '../../data-base/utility/utility.service';
import { GoogleUserSchema } from '../../types/google-user';

let _authProfileModuleRef: ModuleRef | null = null;
export const setAuthGoogleProfileModuleRef = (mr: ModuleRef) => {
  _authProfileModuleRef = mr;
};

/**
 * Google ユーザーデコレーター
 * UtilityService.getAuthenticatedUserProfile を使って ExtraProfile を取得しパースする
 */
export const AuthGoogleUser = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    const mr = _authProfileModuleRef;
    if (!mr) return null;

    const utilityService = mr.get(UtilityService, { strict: false });
    if (!utilityService) return null;

    return utilityService.getAuthenticatedUserProfile(
      ctx,
      'google',
      (rawProfile: any) => GoogleUserSchema.parse(rawProfile),
    );
  },
);
