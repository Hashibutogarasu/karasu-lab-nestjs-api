import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { OAuthProviderFactory } from './lib/auth/oauth-provider.factory';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly oauthProviderFactory: OAuthProviderFactory) {}

  async onModuleInit() {
    this.logOAuthCallbackUrls();
  }

  getVersion(): { version: string } {
    return { version: process.env.VERSION! };
  }

  private logOAuthCallbackUrls() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const configuredProviders =
      this.oauthProviderFactory.getConfiguredProviders();

    this.logger.log('='.repeat(60));
    this.logger.log('OAuth Provider Callback URLs');
    this.logger.log('='.repeat(60));

    if (configuredProviders.length === 0) {
      this.logger.warn('No OAuth providers are configured!');
    } else {
      for (const provider of configuredProviders) {
        const providerName = provider.getProvider();
        const callbackUrl = `${baseUrl}/auth/callback/${providerName}`;
        this.logger.log(`${providerName.toUpperCase()}: ${callbackUrl}`);
      }
    }

    this.logger.log('='.repeat(60));
  }
}
