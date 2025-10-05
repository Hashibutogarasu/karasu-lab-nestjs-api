import { findValidAccessToken } from '../database/query';

/**
 * OAuth 2.0 / OpenID Connect ユーザー情報エンドポイントの処理
 */

export interface UserInfoRequest {
  accessToken: string;
}

export interface UserInfoResponse {
  sub?: string; // Subject - ユーザーの一意識別子
  name?: string; // ユーザーのフルネーム
  given_name?: string; // 名
  family_name?: string; // 姓
  middle_name?: string; // ミドルネーム
  nickname?: string; // ニックネーム
  preferred_username?: string; // 優先ユーザー名
  profile?: string; // プロフィールページのURL
  picture?: string; // プロフィール画像のURL
  website?: string; // WebサイトのURL
  email?: string; // メールアドレス
  email_verified?: boolean; // メールアドレス検証済みフラグ
  gender?: string; // 性別
  birthdate?: string; // 生年月日
  zoneinfo?: string; // タイムゾーン
  locale?: string; // ロケール
  phone_number?: string; // 電話番号
  phone_number_verified?: boolean; // 電話番号検証済みフラグ
  address?: Address; // 住所情報
  updated_at?: number; // 最終更新日時（Unix timestamp）
  error?: string;
  error_description?: string;
}

export interface Address {
  formatted?: string; // フォーマット済み住所
  street_address?: string; // 番地
  locality?: string; // 市区町村
  region?: string; // 都道府県
  postal_code?: string; // 郵便番号
  country?: string; // 国
}

/**
 * アクセストークンからユーザー情報を取得
 */
export async function getUserInfo(
  request: UserInfoRequest,
): Promise<UserInfoResponse> {
  try {
    // トークンの有効性を検証
    const tokenData = await findValidAccessToken(request.accessToken);

    if (!tokenData) {
      return {
        error: 'invalid_token',
        error_description: 'The access token is invalid, expired, or revoked.',
      };
    }

    // スコープに基づいて返すクレームを決定
    const scopes = tokenData.scope ? tokenData.scope.split(' ') : [];
    const userInfo: UserInfoResponse = {};

    // 基本的な情報（常に含まれる）
    userInfo.sub = tokenData.userId;

    // profile スコープに基づく情報
    if (scopes.includes('profile')) {
      // ユーザーのプロフィール情報を含める
      // 実際の実装では、ユーザーテーブルから詳細情報を取得する必要がある
      if (tokenData.user) {
        userInfo.preferred_username = tokenData.user.username;
        // 他のプロフィール情報も追加可能
        // userInfo.name = tokenData.user.fullName;
        // userInfo.picture = tokenData.user.avatarUrl;
        // など...
      }
    }

    // email スコープに基づく情報
    if (scopes.includes('email')) {
      if (tokenData.user?.email) {
        userInfo.email = tokenData.user.email;
        userInfo.email_verified = true; // 実装によって変更
      }
    }

    // phone スコープに基づく情報
    if (scopes.includes('phone')) {
      // 電話番号情報を含める（実装されている場合）
      // userInfo.phone_number = tokenData.user.phoneNumber;
      // userInfo.phone_number_verified = tokenData.user.phoneVerified;
    }

    // address スコープに基づく情報
    if (scopes.includes('address')) {
      // 住所情報を含める（実装されている場合）
      // userInfo.address = {
      //   formatted: tokenData.user.address,
      //   country: tokenData.user.country,
      //   // など...
      // };
    }

    // 最終更新日時
    if (tokenData.user?.updatedAt) {
      userInfo.updated_at = Math.floor(
        tokenData.user.updatedAt.getTime() / 1000,
      );
    }

    return userInfo;
  } catch (error) {
    return {
      error: 'server_error',
      error_description:
        'The authorization server encountered an unexpected condition.',
    };
  }
}

/**
 * Bearer トークンをAuthorizationヘッダーから抽出
 */
export function extractBearerToken(
  authorizationHeader?: string,
): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const matches = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return matches ? matches[1] : null;
}

/**
 * スコープに基づいてクレームをフィルタリング
 */
export function filterClaimsByScope(
  userInfo: UserInfoResponse,
  scopes: string[],
): UserInfoResponse {
  const filteredInfo: UserInfoResponse = {
    sub: userInfo.sub, // sub は常に含まれる
  };

  if (scopes.includes('profile')) {
    filteredInfo.name = userInfo.name;
    filteredInfo.given_name = userInfo.given_name;
    filteredInfo.family_name = userInfo.family_name;
    filteredInfo.middle_name = userInfo.middle_name;
    filteredInfo.nickname = userInfo.nickname;
    filteredInfo.preferred_username = userInfo.preferred_username;
    filteredInfo.profile = userInfo.profile;
    filteredInfo.picture = userInfo.picture;
    filteredInfo.website = userInfo.website;
    filteredInfo.gender = userInfo.gender;
    filteredInfo.birthdate = userInfo.birthdate;
    filteredInfo.zoneinfo = userInfo.zoneinfo;
    filteredInfo.locale = userInfo.locale;
    filteredInfo.updated_at = userInfo.updated_at;
  }

  if (scopes.includes('email')) {
    filteredInfo.email = userInfo.email;
    filteredInfo.email_verified = userInfo.email_verified;
  }

  if (scopes.includes('phone')) {
    filteredInfo.phone_number = userInfo.phone_number;
    filteredInfo.phone_number_verified = userInfo.phone_number_verified;
  }

  if (scopes.includes('address')) {
    filteredInfo.address = userInfo.address;
  }

  return filteredInfo;
}
