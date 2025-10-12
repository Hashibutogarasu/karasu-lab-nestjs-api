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
   */
  getAuthorizationUrl(redirectUri: string, state: string): string;

  /**
   * 認証コードをアクセストークンに交換し、ユーザープロファイルを取得
   * @param code 認証コード
   * @param redirectUri リダイレクトURI
   */
  processOAuth(code: string, redirectUri: string): Promise<OAuthResult>;

  /**
   * このプロバイダーが利用可能かチェック
   * (環境変数が設定されているかなど)
   */
  isAvailable(): boolean;
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
