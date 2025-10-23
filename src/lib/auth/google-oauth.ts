/**
 * Google OAuth認証の実装
 */

import z from 'zod';
import { SnsProfile } from './sns-auth';
import { createZodDto } from 'nestjs-zod';

export const googleProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  picture: z.string().url().optional(),
  email: z.string().email().optional(),
  email_verified: z.boolean().optional(),
  locale: z.string().optional(),
});

export class GoogleProfile extends createZodDto(googleProfileSchema) {}

export const googleTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string(),
  id_token: z.string().optional(),
});

export class GoogleTokenResponse extends createZodDto(
  googleTokenResponseSchema,
) {}

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
