import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { findUserById } from '../../lib';

/**
 * 認証処理の共通ヘルパー
 * JWT認証済みユーザー情報を取得し、指定したプロバイダーのプロフィールを返す
 */
export async function getAuthenticatedUserProfile<T>(
  ctx: ExecutionContext,
  provider: string,
  parseProfile: (rawProfile: any) => T,
): Promise<T> {
  const request = ctx.switchToHttp().getRequest();

  if (!request.user?.id) {
    throw new UnauthorizedException('User not authenticated');
  }

  // ユーザー情報を取得(ExtraProfileを含む)
  const user = await findUserById(request.user.id);

  if (!user) {
    throw new UnauthorizedException('User not found');
  }

  // 指定されたプロバイダーの ExtraProfile を検索
  const profile = user.extraProfiles?.find((p) => p.provider === provider);

  if (!profile) {
    throw new UnauthorizedException(
      `${provider.charAt(0).toUpperCase() + provider.slice(1)} profile not found for this user`,
    );
  }

  // raw_profile をパース
  try {
    return parseProfile(profile.rawProfile);
  } catch (error) {
    throw new UnauthorizedException(
      `Invalid ${provider} profile data: ${error}`,
    );
  }
}
