import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { findUserById } from '../../lib';
import { AppErrorCodes } from '../../types/error-codes';

/**
 * 認証処理の共通ヘルパー
 * JWT認証済みユーザー情報を取得し、指定したプロバイダーのプロフィールを返す
 */
export async function getAuthenticatedUserProfile<T>(
  ctx: ExecutionContext,
  provider: string,
  parseProfile: (rawProfile: any) => T,
): Promise<T | null> {
  const request = ctx.switchToHttp().getRequest();

  if (!request.user?.id) {
    throw AppErrorCodes.UNAUTHORIZED;
  }

  // ユーザー情報を取得(ExtraProfileを含む)
  const user = await findUserById(request.user.id);

  if (!user) {
    throw AppErrorCodes.USER_NOT_FOUND;
  }

  // 指定されたプロバイダーの ExtraProfile を検索
  const profile = user.extraProfiles?.find((p) => p.provider === provider);

  if (!profile) {
    return null;
  }

  // raw_profile をパース
  try {
    return parseProfile(profile.rawProfile);
  } catch (error) {
    throw AppErrorCodes.INVALID_PROFILE_DATA;
  }
}
