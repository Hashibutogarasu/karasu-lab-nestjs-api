/**
 * OAuth プロバイダーファクトリー
 * プロバイダー名から適切なOAuthプロバイダーインスタンスを返す
 */

import { Injectable } from '@nestjs/common';
import {
  IOAuthProvider,
  ProviderNotImplementedError,
} from './oauth-provider.interface';
import { GoogleOAuthProvider } from './google-oauth.provider';
import { DiscordOAuthProvider } from './discord-oauth.provider';
import { XOAuthProvider } from './x-oauth.provider';
@Injectable()
export class OAuthProviderFactory {
  private providers: Map<string, IOAuthProvider>;

  constructor(
    private readonly googleProvider: GoogleOAuthProvider,
    private readonly discordProvider: DiscordOAuthProvider,
    private readonly xOAuthProvider: XOAuthProvider,
  ) {
    this.providers = new Map([
      ['google', this.googleProvider],
      ['discord', this.discordProvider],
      ['x', this.xOAuthProvider],
    ]);
  }

  /**
   * プロバイダー名から適切なOAuthプロバイダーを取得
   * @param provider プロバイダー名 ('google', 'discord', etc.)
   * @throws ProviderNotImplementedError プロバイダーが実装されていない場合
   */
  getProvider(provider: string): IOAuthProvider {
    const providerInstance = this.providers.get(provider.toLowerCase());
    if (!providerInstance) {
      throw new ProviderNotImplementedError(provider);
    }
    return providerInstance;
  }

  /**
   * 利用可能なすべてのプロバイダーを取得
   */
  getAllProviders(): IOAuthProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 利用可能なプロバイダー名のリストを取得
   */
  getAvailableProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * 設定済みで利用可能なプロバイダーのみを取得
   */
  getConfiguredProviders(): IOAuthProvider[] {
    return this.getAllProviders().filter((provider) => provider.isAvailable());
  }
}
