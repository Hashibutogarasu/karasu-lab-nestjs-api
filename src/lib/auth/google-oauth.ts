/**
 * Google OAuth認証の実装
 */

import { SnsProfile } from './sns-auth';

export interface GoogleProfile {
  id: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
  locale?: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  id_token?: string;
}

/**
 * Googleの認可コードをアクセストークンに交換
 */
export async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  const tokenEndpoint = 'https://oauth2.googleapis.com/token';

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google token exchange failed: ${errorText}`);
  }

  return response.json();
}

/**
 * Googleのアクセストークンでユーザー情報を取得
 */
export async function getGoogleProfile(
  accessToken: string,
): Promise<GoogleProfile> {
  const userInfoEndpoint = 'https://www.googleapis.com/oauth2/v2/userinfo';

  const response = await fetch(userInfoEndpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google profile fetch failed: ${errorText}`);
  }

  return response.json();
}

/**
 * GoogleプロファイルをSnsProfileに変換
 */
export function convertGoogleProfileToSnsProfile(
  googleProfile: GoogleProfile,
): SnsProfile {
  return {
    providerId: googleProfile.id,
    provider: 'google',
    displayName: googleProfile.name,
    email: googleProfile.email,
    avatarUrl: googleProfile.picture,
    rawProfile: googleProfile,
  };
}

/**
 * Google OAuth認証の完全なフロー
 */
export async function processGoogleOAuth(
  code: string,
  redirectUri: string,
): Promise<{
  snsProfile: SnsProfile;
  accessToken: string;
}> {
  // 1. 認可コードをアクセストークンに交換
  const tokenResponse = await exchangeGoogleCode(code, redirectUri);

  // 2. アクセストークンでプロファイル情報を取得
  const googleProfile = await getGoogleProfile(tokenResponse.access_token);

  // 3. 共通のSnsProfile形式に変換
  return {
    snsProfile: convertGoogleProfileToSnsProfile(googleProfile),
    accessToken: tokenResponse.access_token,
  };
}
