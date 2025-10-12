/**
 * Google OAuth プロバイダー実装
 */

import { Injectable } from '@nestjs/common';
import {
  IOAuthProvider,
  OAuthResult,
  ProviderUnavailableError,
} from './oauth-provider.interface';
import {
  exchangeGoogleCode,
  getGoogleProfile,
  convertGoogleProfileToSnsProfile,
} from './google-oauth';

@Injectable()
export class GoogleOAuthProvider implements IOAuthProvider {
  getProvider(): string {
    return 'google';
  }

  getAuthorizationUrl(
    redirectUri: string,
    state: string,
    _codeChallenge?: string,
  ): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new ProviderUnavailableError(
        this.getProvider(),
        'GOOGLE_CLIENT_ID not configured',
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async processOAuth(
    code: string,
    redirectUri: string,
    _codeVerifier?: string,
  ): Promise<OAuthResult> {
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

  isAvailable(): boolean {
    return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }
}
