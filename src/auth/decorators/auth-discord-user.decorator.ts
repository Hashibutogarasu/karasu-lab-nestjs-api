import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { findUserById } from '../../lib';
import { DiscordUserSchema } from '../../types/discord-user';

/**
 * Discord ユーザーデコレーター
 * JWT認証済みユーザーの Discord プロフィールを取得する
 * ExtraProfile の raw_profile から Discord ユーザー情報をパース
 */
export const AuthDiscordUser = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    if (!request.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    // ユーザー情報を取得(ExtraProfileを含む)
    const user = await findUserById(request.user.id);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Discord の ExtraProfile を検索
    const discordProfile = user.extraProfiles?.find(
      (profile) => profile.provider === 'discord',
    );

    if (!discordProfile) {
      throw new UnauthorizedException(
        'Discord profile not found for this user',
      );
    }

    // raw_profile を Zod でパース
    try {
      const discordUser = DiscordUserSchema.parse(discordProfile.rawProfile);
      return discordUser;
    } catch (error) {
      throw new UnauthorizedException('Invalid Discord profile data: ' + error);
    }
  },
);
