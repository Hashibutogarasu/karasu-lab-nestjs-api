/**
 * X OAuth プロバイダー実装
 */

import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import {
  IOAuthProvider,
  OAuthResult,
  ProviderUnavailableError,
} from './oauth-provider.interface';
import {
  exchangeXCode,
  getXProfile,
  convertXProfileToSnsProfile,
} from './x-oauth';

@Injectable()
export class XOAuthProvider implements IOAuthProvider {
  getProvider(): string {
    return 'x';
  }

  /**
   * PKCE code_verifierを生成
   */
  generateCodeVerifier(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * PKCE code_challengeを生成
   */
  generateCodeChallenge(codeVerifier: string): string {
    return createHash('sha256').update(codeVerifier).digest('base64url');
  }

  getAuthorizationUrl(
    redirectUri: string,
    state: string,
    codeChallenge?: string,
  ): string {
    const clientId = process.env.X_CLIENT_ID!;
    if (!clientId) {
      throw new ProviderUnavailableError(
        this.getProvider(),
        'X_CLIENT_ID not configured',
      );
    }

    if (!codeChallenge) {
      throw new Error('code_challenge is required for X OAuth');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'tweet.read users.read offline.access',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `https://x.com/i/oauth2/authorize?${params.toString()}`;
  }

  async processOAuth(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<OAuthResult> {
    if (!codeVerifier) {
      throw new Error('code_verifier is required for X OAuth');
    }

    const tokenResponse = await exchangeXCode(code, redirectUri, codeVerifier);
    const xProfile = await getXProfile(tokenResponse.access_token);

    return {
      snsProfile: convertXProfileToSnsProfile(xProfile),
      accessToken: tokenResponse.access_token,
    };
  }

  isAvailable(): boolean {
    return !!(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET);
  }
}
