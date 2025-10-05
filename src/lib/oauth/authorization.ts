import {
  findClientById,
  validateRedirectUri,
  createAuthorizationCode,
  findUserConsent,
  upsertUserConsent,
  isValidScope,
} from '../database/query';

/**
 * OAuth 2.0 認可エンドポイントの処理
 * 認可リクエストを検証し、認可コードを生成する
 */
export interface ConsentInfo {
  clientName: string;
  requestedScopes: string[];
  user_id: string;
}

export interface AuthorizeRequest {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

export interface AuthorizeResult {
  success: boolean;
  authorizationCode?: string;
  redirectUri?: string;
  error?: string;
  errorDescription?: string;
  needsConsent?: boolean;
  consentInfo?: ConsentInfo;
}

/**
 * 認可リクエストを検証
 */
export async function validateAuthorizeRequest(
  request: AuthorizeRequest,
): Promise<{
  isValid: boolean;
  error?: string;
  errorDescription?: string;
}> {
  // 1. response_typeの検証
  if (request.response_type !== 'code') {
    return {
      isValid: false,
      error: 'unsupported_response_type',
      errorDescription:
        'The authorization server does not support obtaining an authorization code using this method.',
    };
  }

  // 2. client_idの検証
  const client = await findClientById(request.client_id);
  if (!client) {
    return {
      isValid: false,
      error: 'invalid_client',
      errorDescription: 'Client authentication failed.',
    };
  }

  // 3. redirect_uriの検証
  const isValidRedirectUri = await validateRedirectUri(
    request.client_id,
    request.redirect_uri,
  );
  if (!isValidRedirectUri) {
    return {
      isValid: false,
      error: 'invalid_request',
      errorDescription: 'The redirect URI is not registered for this client.',
    };
  }

  // 4. グラントタイプの検証
  if (!client.grantTypes.includes('authorization_code')) {
    return {
      isValid: false,
      error: 'unauthorized_client',
      errorDescription:
        'The client is not authorized to request an authorization code using this method.',
    };
  }

  // 5. スコープの検証
  if (request.scope && client.scope) {
    if (!isValidScope(request.scope, client.scope)) {
      return {
        isValid: false,
        error: 'invalid_scope',
        errorDescription:
          'The requested scope is invalid, unknown, or malformed.',
      };
    }
  }

  // 6. stateパラメータの検証
  if (!request.state) {
    return {
      isValid: false,
      error: 'invalid_request',
      errorDescription: 'The state parameter is required.',
    };
  }

  // 7. PKCE の検証 (推奨)
  if (request.code_challenge) {
    if (!request.code_challenge_method) {
      request.code_challenge_method = 'plain'; // デフォルト
    }

    if (!['S256', 'plain'].includes(request.code_challenge_method)) {
      return {
        isValid: false,
        error: 'invalid_request',
        errorDescription: 'Transform algorithm not supported.',
      };
    }
  }

  return { isValid: true };
}

/**
 * ユーザーの同意を確認
 */
export async function checkUserConsent(
  userId: string,
  clientId: string,
  requestedScope?: string,
): Promise<{
  hasConsent: boolean;
  grantedScope?: string;
}> {
  const consent = await findUserConsent(userId, clientId);

  if (!consent) {
    return { hasConsent: false };
  }

  // スコープが変更されていないか確認
  if (requestedScope) {
    const requestedScopes = requestedScope.split(' ').sort();
    const grantedScopes = consent.grantedScope.split(' ').sort();

    // 新しいスコープが要求されている場合は再同意が必要
    const hasNewScopes = requestedScopes.some(
      (scope) => !grantedScopes.includes(scope),
    );

    if (hasNewScopes) {
      return { hasConsent: false };
    }
  }

  return {
    hasConsent: true,
    grantedScope: consent.grantedScope,
  };
}

/**
 * 認可コードを生成
 */
export async function generateAuthorizationCode(
  request: AuthorizeRequest,
  userId: string,
): Promise<AuthorizeResult> {
  try {
    // 認可リクエストの検証
    const validation = await validateAuthorizeRequest(request);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
        errorDescription: validation.errorDescription,
      };
    }

    // ユーザーの同意確認
    const consentCheck = await checkUserConsent(
      userId,
      request.client_id,
      request.scope,
    );

    if (!consentCheck.hasConsent) {
      const client = await findClientById(request.client_id);
      return {
        success: false,
        needsConsent: true,
        consentInfo: {
          clientName: client!.name,
          requestedScopes: request.scope ? request.scope.split(' ') : [],
          user_id: userId,
        },
      };
    }

    // 認可コードを生成
    const authorizationCode = await createAuthorizationCode({
      clientId: request.client_id,
      userId,
      redirectUri: request.redirect_uri,
      scope: consentCheck.grantedScope || request.scope,
      codeChallenge: request.code_challenge,
      codeChallengeMethod: request.code_challenge_method,
    });

    // リダイレクトURIを構築
    const redirectUrl = new URL(request.redirect_uri);
    redirectUrl.searchParams.set('code', authorizationCode);
    redirectUrl.searchParams.set('state', request.state);

    return {
      success: true,
      authorizationCode,
      redirectUri: redirectUrl.toString(),
    };
  } catch (error) {
    return {
      success: false,
      error: 'server_error',
      errorDescription:
        'The authorization server encountered an unexpected condition.',
    };
  }
}

/**
 * ユーザー同意を処理
 */
export async function processUserConsent(
  userId: string,
  clientId: string,
  grantedScopes: string[],
  approved: boolean,
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!approved) {
    return {
      success: false,
      error: 'access_denied',
    };
  }

  try {
    // 同意を保存
    await upsertUserConsent({
      userId,
      clientId,
      grantedScope: grantedScopes.join(' '),
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: 'server_error',
    };
  }
}

/**
 * エラーレスポンス用のリダイレクトURIを構築
 */
export function buildErrorRedirectUri(
  redirectUri: string,
  error: string,
  errorDescription?: string,
  state?: string,
): string {
  const url = new URL(redirectUri);
  url.searchParams.set('error', error);
  if (errorDescription) {
    url.searchParams.set('error_description', errorDescription);
  }
  if (state) {
    url.searchParams.set('state', state);
  }
  return url.toString();
}
