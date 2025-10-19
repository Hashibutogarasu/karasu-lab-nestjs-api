import { DynamicModule, Module, Provider } from '@nestjs/common';
import { EncryptionService, KeyPair } from './encryption.service';
import { ExternalProviderAccessTokenService } from './external-provider-access-token/external-provider-access-token.service';

export const ENCRYPTION_OPTIONS = 'ENCRYPTION_OPTIONS';

@Module({
  providers: [
    /* runtime providers are registered via forRoot */
  ],
})
export class EncryptionModule {
  static forRoot(options: Partial<KeyPair>): DynamicModule {
    const optionsProvider: Provider = {
      provide: ENCRYPTION_OPTIONS,
      useValue: options,
    };

    const serviceProvider: Provider = {
      provide: EncryptionService,
      useFactory: (opts: Partial<KeyPair>) => new EncryptionService(opts),
      inject: [ENCRYPTION_OPTIONS],
    };

    return {
      module: EncryptionModule,
      global: true,
      providers: [
        optionsProvider,
        serviceProvider,
        ExternalProviderAccessTokenService,
      ],
      exports: [EncryptionService, ExternalProviderAccessTokenService],
    };
  }
}
