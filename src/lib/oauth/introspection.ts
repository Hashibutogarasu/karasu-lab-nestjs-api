import { findValidAccessToken, hashString } from '../database/query';

/**
 * OAuth 2.0 トークンイントロスペクションエンドポイントの処理
 */

export interface IntrospectTokenRequest {
  token: string;
  token_type_hint?: 'access_token' | 'refresh_token';
  client_id: string;
  client_secret?: string;
}

export interface IntrospectTokenResponse {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  sub?: string;
  aud?: string;
  iss?: string;
  jti?: string;
  error?: string;
  error_description?: string;
}

/**
 * トークンの情報を取得する（イントロスペクション）
 */
export async function introspectToken(
  request: IntrospectTokenRequest,
): Promise<IntrospectTokenResponse> {
  try {
    // トークンが有効かチェック
    const tokenData = await findValidAccessToken(request.token);

    if (!tokenData) {
      // トークンが無効または期限切れ
      return { active: false };
    }

    // クライアントの認可チェック（オプション）
    // 実装によってはトークンを発行したクライアントのみがイントロスペクト可能
    if (request.client_id !== tokenData.clientId) {
      // セキュリティ上の理由でトークンの情報を返さない
      return { active: false };
    }

    // アクティブなトークンの情報を返す
    return {
      active: true,
      scope: tokenData.scope || undefined,
      client_id: tokenData.clientId,
      username: tokenData.user?.username,
      token_type: 'Bearer',
      exp: Math.floor(tokenData.expiresAt.getTime() / 1000), // Unix timestamp
      iat: Math.floor(tokenData.createdAt.getTime() / 1000), // Unix timestamp
      sub: tokenData.userId, // Subject (ユーザーID)
      aud: tokenData.clientId, // Audience (クライアントID)
      iss: process.env.ISSUER_URL || 'https://localhost:3000', // Issuer
      jti: hashString(request.token).substring(0, 16), // JWT ID (トークンハッシュの一部)
    };
  } catch (error) {
    return {
      active: false,
      error: 'server_error',
      error_description:
        'The authorization server encountered an unexpected condition.',
    };
  }
}

/**
 * トークンの基本的な有効性をチェック
 */
export async function isTokenValid(token: string): Promise<boolean> {
  try {
    const tokenData = await findValidAccessToken(token);
    return tokenData !== null;
  } catch (error) {
    return false;
  }
}

/**
 * トークンからユーザー情報を取得
 */
export async function getUserInfoFromToken(token: string) {
  try {
    const tokenData = await findValidAccessToken(token);
    if (!tokenData) {
      return null;
    }

    return {
      id: tokenData.user?.id,
      username: tokenData.user?.username,
      email: tokenData.user?.email,
      clientId: tokenData.clientId,
      scope: tokenData.scope,
    };
  } catch (error) {
    return null;
  }
}
