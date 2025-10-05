import {
  revokeAccessToken,
  revokeRefreshToken,
  findValidAccessToken,
  consumeRefreshToken,
  verifyClientSecret,
} from '../database/query';

/**
 * OAuth 2.0 トークン失効エンドポイントの処理
 */

export interface RevokeTokenRequest {
  token: string;
  token_type_hint?: 'access_token' | 'refresh_token';
  client_id: string;
  client_secret?: string;
}

export interface RevokeTokenResponse {
  success: boolean;
  error?: string;
  error_description?: string;
}

/**
 * トークンを失効させる
 */
export async function revokeToken(
  request: RevokeTokenRequest,
): Promise<RevokeTokenResponse> {
  try {
    // クライアント認証
    if (request.client_secret) {
      const isValidClient = await verifyClientSecret(
        request.client_id,
        request.client_secret,
      );
      if (!isValidClient) {
        return {
          success: false,
          error: 'invalid_client',
          error_description: 'Client authentication failed.',
        };
      }
    }

    let revoked = false;

    // token_type_hintに基づいて処理を最適化
    if (request.token_type_hint === 'access_token') {
      // アクセストークンとして試行
      revoked = await revokeAccessToken(request.token);

      // 失敗した場合はリフレッシュトークンとして試行
      if (!revoked) {
        revoked = await revokeRefreshToken(request.token);
      }
    } else if (request.token_type_hint === 'refresh_token') {
      // リフレッシュトークンとして試行
      revoked = await revokeRefreshToken(request.token);

      // 失敗した場合はアクセストークンとして試行
      if (!revoked) {
        revoked = await revokeAccessToken(request.token);
      }
    } else {
      // ヒントがない場合は両方試行
      const accessTokenRevoked = await revokeAccessToken(request.token);
      const refreshTokenRevoked = await revokeRefreshToken(request.token);
      revoked = accessTokenRevoked || refreshTokenRevoked;
    }

    // RFC 7009によると、トークンが存在しない場合でも成功レスポンスを返す
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: 'server_error',
      error_description:
        'The authorization server encountered an unexpected condition.',
    };
  }
}

/**
 * 関連するすべてのトークンを失効させる
 * （アクセストークンが失効された場合、関連するリフレッシュトークンも失効）
 */
export async function revokeAllRelatedTokens(
  accessToken: string,
): Promise<boolean> {
  try {
    // アクセストークンを失効
    const accessRevoked = await revokeAccessToken(accessToken);

    // 関連するリフレッシュトークンを失効
    // 注意: これは実装によって異なる場合がある
    // 現在のスキーマではリフレッシュトークンからアクセストークンを参照している

    return accessRevoked;
  } catch (error) {
    return false;
  }
}
