import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GoogleUserSchema } from '../../types/google-user';
import { getAuthenticatedUserProfile } from './auth-base.decorator';

/**
 * Google ユーザーデコレーター
 * JWT認証済みユーザーの Google プロフィールを取得する
 * ExtraProfile の raw_profile から Google ユーザー情報をパース
 */
export const AuthGoogleUser = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    return getAuthenticatedUserProfile(ctx, 'google', (rawProfile) =>
      GoogleUserSchema.parse(rawProfile),
    );
  },
);
