/**
 * Discord OAuth プロバイダー実装
 */

import { Injectable } from '@nestjs/common';
import {
  IOAuthProvider,
  OAuthResult,
  ProviderUnavailableError,
} from './oauth-provider.interface';
import {
  exchangeDiscordCode,
  getDiscordProfile,
  convertDiscordProfileToSnsProfile,
} from './discord-oauth';

@Injectable()
export class DiscordOAuthProvider implements IOAuthProvider {
  getProvider(): string {
    return 'discord';
  }

  getAuthorizationUrl(redirectUri: string, state: string): string {
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId) {
      throw new ProviderUnavailableError(
        'discord',
        'DISCORD_CLIENT_ID not configured',
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify email',
      state,
    });

    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }

  async processOAuth(code: string, redirectUri: string): Promise<OAuthResult> {
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

  isAvailable(): boolean {
    return !!(
      process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
    );
  }
}
