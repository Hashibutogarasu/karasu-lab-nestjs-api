/**
 * X (旧Twitter) OAuth認証の実装（OAuth 2.0 Authorization Code Flow）
 */

import { AppErrorCodes } from '../../types/error-codes';
import { SnsProfile } from './sns-auth';

export interface XProfile {
  id: string;
  name?: string;
  username?: string;
  profile_image_url?: string;
  email?: string; // X may not provide email depending on scopes
  [key: string]: any;
}

export interface XTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Xの認可コードをアクセストークンに交換
 */
export async function exchangeXCode(
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<XTokenResponse> {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw AppErrorCodes.X_CLIENT_CONFIGURATION;
  }

  const tokenEndpoint = 'https://api.x.com/2/oauth2/token';

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });

  // X requires client authentication via Basic Authorization header.
  const basicAuth = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuth,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw AppErrorCodes.X_TOKEN_EXCHANGE_FAILED;
  }

  return response.json();
}

/**
 * Xのアクセストークンでユーザー情報を取得
 */
export async function getXProfile(accessToken: string): Promise<XProfile> {
  // API v2: /2/users/me with expansions for profile_image_url
  const userInfoEndpoint =
    'https://api.x.com/2/users/me?user.fields=profile_image_url,username,name';

  const response = await fetch(userInfoEndpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw AppErrorCodes.X_TOKEN_EXCHANGE_FAILED;
  }

  const json = await response.json();

  // response typically is { data: { id, name, username, profile_image_url } }
  return json.data || json;
}

/**
 * XプロファイルをSnsProfileに変換
 */
export function convertXProfileToSnsProfile(xProfile: XProfile): SnsProfile {
  return {
    providerId: xProfile.id,
    provider: 'x',
    displayName: xProfile.name || xProfile.username || undefined,
    email: xProfile.email,
    avatarUrl: xProfile.profile_image_url,
    rawProfile: xProfile,
  };
}

/**
 * X OAuth認証の完全なフロー
 */
export async function processXOAuth(
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<{
  snsProfile: SnsProfile;
  accessToken: string;
}> {
  const tokenResponse = await exchangeXCode(code, redirectUri, codeVerifier);
  const xProfile = await getXProfile(tokenResponse.access_token);

  return {
    snsProfile: convertXProfileToSnsProfile(xProfile),
    accessToken: tokenResponse.access_token,
  };
}
