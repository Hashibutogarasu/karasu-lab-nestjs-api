/**
 * Discord OAuth認証の実装
 */

import { SnsProfile } from './sns-auth';

export interface DiscordProfile {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string;
  avatar?: string;
  email?: string;
  verified?: boolean;
  locale?: string;
  mfa_enabled?: boolean;
  premium_type?: number;
  public_flags?: number;
}

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

/**
 * Discordの認可コードをアクセストークンに交換
 */
export async function exchangeDiscordCode(
  code: string,
  redirectUri: string,
): Promise<DiscordTokenResponse> {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Discord OAuth credentials not configured');
  }

  const tokenEndpoint = 'https://discord.com/api/oauth2/token';

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
    throw new Error(`Discord token exchange failed: ${errorText}`);
  }

  return response.json();
}

/**
 * Discordのアクセストークンでユーザー情報を取得
 */
export async function getDiscordProfile(
  accessToken: string,
): Promise<DiscordProfile> {
  const userInfoEndpoint = 'https://discord.com/api/users/@me';

  const response = await fetch(userInfoEndpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Discord profile fetch failed: ${errorText}`);
  }

  return response.json();
}

/**
 * DiscordプロファイルをSnsProfileに変換
 */
export function convertDiscordProfileToSnsProfile(
  discordProfile: DiscordProfile,
): SnsProfile {
  const displayName = discordProfile.global_name || discordProfile.username;
  const avatarUrl = discordProfile.avatar
    ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png`
    : undefined;

  return {
    providerId: discordProfile.id,
    provider: 'discord',
    displayName,
    email: discordProfile.email,
    avatarUrl,
    rawProfile: discordProfile,
  };
}

/**
 * Discord OAuth認証の完全なフロー
 */
export async function processDiscordOAuth(
  code: string,
  redirectUri: string,
): Promise<{
  snsProfile: SnsProfile;
  accessToken: string;
}> {
  // 1. 認可コードをアクセストークンに交換
  const tokenResponse = await exchangeDiscordCode(code, redirectUri);

  // 2. アクセストークンでプロファイル情報を取得
  const discordProfile = await getDiscordProfile(tokenResponse.access_token);

  // 3. 共通のSnsProfile形式に変換
  return {
    snsProfile: convertDiscordProfileToSnsProfile(discordProfile),
    accessToken: tokenResponse.access_token,
  };
}
