import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DiscordUserSchema } from '../../types/discord-user';
import { getAuthenticatedUserProfile } from './auth-base.decorator';

/**
 * Discord ユーザーデコレーター
 * JWT認証済みユーザーの Discord プロフィールを取得する
 * ExtraProfile の raw_profile から Discord ユーザー情報をパース
 */
export const AuthDiscordUser = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    return getAuthenticatedUserProfile(ctx, 'discord', (rawProfile) =>
      DiscordUserSchema.parse(rawProfile),
    );
  },
);
