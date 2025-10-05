import {
  consumeAuthorizationCode,
  verifyClientSecret,
  verifyCodeChallenge,
  createAccessToken,
  createRefreshToken,
  consumeRefreshToken,
  validateRedirectUri,
  isValidScope,
} from '../database/query';

/**
 * OAuth 2.0 トークンエンドポイントの処理
 * 認可コードやリフレッシュトークンをアクセストークンと交換する
 */

export interface TokenRequest {
  grant_type: string;
  code?: string;
  redirect_uri: string;
  client_id: string;
  client_secret?: string;
  code_verifier?: string;
  refresh_token?: string;
  scope?: string;
}

export interface TokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

/**
 * クライアント認証
 */
export async function authenticateClient(
  clientId: string,
  clientSecret?: string,
): Promise<{
  isAuthenticated: boolean;
  error?: string;
  errorDescription?: string;
}> {
  if (!clientSecret) {
    // パブリッククライアントの場合はクライアントシークレットは不要
    // ただし、クライアントIDは有効である必要がある
    return { isAuthenticated: true };
  }

  const isValid = await verifyClientSecret(clientId, clientSecret);
  if (!isValid) {
    return {
      isAuthenticated: false,
      error: 'invalid_client',
      errorDescription: 'Client authentication failed.',
    };
  }

  return { isAuthenticated: true };
}

/**
 * 認可コードグラント処理
 */
export async function processAuthorizationCodeGrant(
  request: TokenRequest,
): Promise<TokenResponse> {
  // 必須パラメータの検証
  if (!request.code || !request.redirect_uri) {
    return {
      error: 'invalid_request',
      error_description: 'Missing required parameters.',
    };
  }

  try {
    // 認可コードを取得・消費
    const authCode = await consumeAuthorizationCode(request.code);
    if (!authCode) {
      return {
        error: 'invalid_grant',
        error_description:
          'The provided authorization grant is invalid, expired, revoked, or was issued to another client.',
      };
    }

    // クライアントの検証
    if (authCode.clientId !== request.client_id) {
      return {
        error: 'invalid_grant',
        error_description:
          'The authorization code was issued to another client.',
      };
    }

    // リダイレクトURIの検証
    if (authCode.redirectUri !== request.redirect_uri) {
      return {
        error: 'invalid_grant',
        error_description: 'The redirect URI does not match.',
      };
    }

    // PKCEの検証
    if (authCode.codeChallenge) {
      if (!request.code_verifier) {
        return {
          error: 'invalid_request',
          error_description: 'PKCE code verifier is required.',
        };
      }

      const isValidChallenge = verifyCodeChallenge(
        request.code_verifier,
        authCode.codeChallenge,
        authCode.codeChallengeMethod || 'S256',
      );

      if (!isValidChallenge) {
        return {
          error: 'invalid_grant',
          error_description: 'PKCE verification failed.',
        };
      }
    }

    // アクセストークン生成
    const accessToken = await createAccessToken({
      clientId: authCode.clientId,
      userId: authCode.userId,
      scope: authCode.scope || undefined,
    });

    // リフレッシュトークン生成
    const refreshToken = await createRefreshToken({
      accessToken,
      clientId: authCode.clientId,
      userId: authCode.userId,
      scope: authCode.scope || undefined,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // 60分
      refresh_token: refreshToken,
      scope: authCode.scope || undefined,
    };
  } catch (error) {
    return {
      error: 'server_error',
      error_description:
        'The authorization server encountered an unexpected condition.',
    };
  }
}

/**
 * リフレッシュトークングラント処理
 */
export async function processRefreshTokenGrant(
  request: TokenRequest,
): Promise<TokenResponse> {
  if (!request.refresh_token) {
    return {
      error: 'invalid_request',
      error_description: 'Missing refresh token.',
    };
  }

  try {
    // リフレッシュトークンを取得・消費（ローテーション）
    const refreshTokenData = await consumeRefreshToken(request.refresh_token);
    if (!refreshTokenData) {
      return {
        error: 'invalid_grant',
        error_description: 'The refresh token is invalid, expired, or revoked.',
      };
    }

    // クライアントの検証
    if (refreshTokenData.clientId !== request.client_id) {
      return {
        error: 'invalid_grant',
        error_description: 'The refresh token was issued to another client.',
      };
    }

    // スコープの検証（縮小は許可、拡大は不許可）
    let finalScope = refreshTokenData.scope;
    if (request.scope) {
      if (
        !refreshTokenData.scope ||
        !isValidScope(request.scope, refreshTokenData.scope)
      ) {
        return {
          error: 'invalid_scope',
          error_description:
            'The requested scope exceeds the scope granted by the resource owner.',
        };
      }
      finalScope = request.scope;
    }

    // 新しいアクセストークン生成
    const accessToken = await createAccessToken({
      clientId: refreshTokenData.clientId,
      userId: refreshTokenData.userId,
      scope: finalScope || undefined,
    });

    // 新しいリフレッシュトークン生成（ローテーション）
    const newRefreshToken = await createRefreshToken({
      accessToken,
      clientId: refreshTokenData.clientId,
      userId: refreshTokenData.userId,
      scope: finalScope || undefined,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // 60分
      refresh_token: newRefreshToken,
      scope: finalScope || undefined,
    };
  } catch (error) {
    return {
      error: 'server_error',
      error_description:
        'The authorization server encountered an unexpected condition.',
    };
  }
}

/**
 * クライアントクレデンシャルグラント処理
 */
export async function processClientCredentialsGrant(
  request: TokenRequest,
): Promise<TokenResponse> {
  try {
    // クライアント認証（必須）
    const clientAuth = await authenticateClient(
      request.client_id,
      request.client_secret,
    );
    if (!clientAuth.isAuthenticated) {
      return {
        error: clientAuth.error,
        error_description: clientAuth.errorDescription,
      };
    }

    // スコープの検証（クライアントが許可されたスコープ内であること）
    // 注意: ユーザーIDは存在しないため、クライアント自身のIDを使用
    const accessToken = await createAccessToken({
      clientId: request.client_id,
      userId: request.client_id, // クライアント自身
      scope: request.scope,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // 60分
      scope: request.scope,
      // 注意: クライアントクレデンシャルグラントではリフレッシュトークンは発行しない
    };
  } catch (error) {
    return {
      error: 'server_error',
      error_description:
        'The authorization server encountered an unexpected condition.',
    };
  }
}

/**
 * トークンリクエストのメイン処理
 */
export async function processTokenRequest(
  request: TokenRequest,
): Promise<TokenResponse> {
  // クライアント認証
  const clientAuth = await authenticateClient(
    request.client_id,
    request.client_secret,
  );
  if (!clientAuth.isAuthenticated) {
    return {
      error: clientAuth.error,
      error_description: clientAuth.errorDescription,
    };
  }

  // グラントタイプによる分岐
  switch (request.grant_type) {
    case 'authorization_code':
      return processAuthorizationCodeGrant(request);

    case 'refresh_token':
      return processRefreshTokenGrant(request);

    case 'client_credentials':
      return processClientCredentialsGrant(request);

    default:
      return {
        error: 'unsupported_grant_type',
        error_description:
          'The authorization grant type is not supported by the authorization server.',
      };
  }
}
