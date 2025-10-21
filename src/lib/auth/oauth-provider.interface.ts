/**
 * OAuth プロバイダーインターフェース
 * 各SNSプロバイダーの認証処理を統一的に扱うための抽象インターフェース
 */

import { SnsProfile } from './sns-auth';

/**
 * OAuth認証の結果
 */
export interface OAuthResult {
  snsProfile: SnsProfile;
  accessToken: string;
}

/**
 * OAuth プロバイダーのインターフェース
 */
export interface IOAuthProvider {
  /**
   * プロバイダー名を取得
   */
  getProvider(): string;

  /**
   * 認証URLを生成
   * @param redirectUri リダイレクトURI
   * @param state ステートコード
   * @param codeChallenge PKCE code_challenge (オプション)
   */
  getAuthorizationUrl(
    redirectUri: string,
    state?: string,
    codeChallenge?: string,
  ): string;

  /**
   * 認証コードをアクセストークンに交換し、ユーザープロファイルを取得
   * @param code 認証コード
   * @param redirectUri リダイレクトURI
   * @param codeVerifier PKCE code_verifier (オプション)
   */
  processOAuth(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<OAuthResult>;

  /**
   * このプロバイダーが利用可能かチェック
   * (環境変数が設定されているかなど)
   */
  isAvailable(): boolean;

  /**
   * PKCE code_verifierを生成 (オプション)
   */
  generateCodeVerifier?(): string;

  /**
   * PKCE code_challengeを生成 (オプション)
   */
  generateCodeChallenge?(codeVerifier: string): string;
}

/**
 * プロバイダーが実装されていない場合のエラー
 */
export class ProviderNotImplementedError extends Error {
  constructor(provider: string) {
    super(`OAuth provider '${provider}' is not implemented`);
    this.name = 'ProviderNotImplementedError';
  }
}

/**
 * プロバイダーが利用不可の場合のエラー
 */
export class ProviderUnavailableError extends Error {
  constructor(provider: string, reason?: string) {
    super(
      `OAuth provider '${provider}' is not available${reason ? `: ${reason}` : ''}`,
    );
    this.name = 'ProviderUnavailableError';
  }
}
