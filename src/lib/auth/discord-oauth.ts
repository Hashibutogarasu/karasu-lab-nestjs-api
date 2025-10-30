/**
 * Discord OAuth認証の実装
 */

import z from 'zod';
import { SnsProfile } from './sns-auth';
import { createZodDto } from 'nestjs-zod';
import { AppErrorCodes } from '../../types/error-codes';

export const discordProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  discriminator: z.string(),
  global_name: z.string().optional(),
  avatar: z.string().optional(),
  email: z.string().optional(),
  verified: z.boolean().optional(),
  locale: z.string().optional(),
  mfa_enabled: z.boolean().optional(),
  premium_type: z.number().optional(),
  public_flags: z.number().optional(),
});

export class DiscordProfile extends createZodDto(discordProfileSchema) {}

export const discordTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
});

export class DiscordTokenResponse extends createZodDto(
  discordTokenResponseSchema,
) {}

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
    throw AppErrorCodes.DISCORD_CLIENT_CONFIGURATION;
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
    throw AppErrorCodes.DISCORD_TOKEN_EXCHANGE_FAILED;
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
    throw AppErrorCodes.DISCORD_TOKEN_EXCHANGE_FAILED;
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
