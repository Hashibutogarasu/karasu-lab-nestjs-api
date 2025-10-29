import { DynamicModule, Module, Provider, ModuleMetadata } from '@nestjs/common';
import { EncryptionService, KeyPair } from './encryption.service';
import { AppConfigService } from '../app-config/app-config.service';

export const ENCRYPTION_OPTIONS = 'ENCRYPTION_OPTIONS';

@Module({
  providers: [],
})
export class EncryptionModule {
  static forRoot(
    options: Partial<KeyPair> & { global?: boolean } = {},
  ): DynamicModule {
    const moduleGlobal = options.global ?? true;

    const optionsProvider: Provider = {
      provide: ENCRYPTION_OPTIONS,
      useValue: options,
    };

    const serviceProvider: Provider = {
      provide: EncryptionService,
      useFactory: (appConfig: AppConfigService, opts: Partial<KeyPair>) =>
        new EncryptionService(appConfig, opts),
      inject: [AppConfigService, ENCRYPTION_OPTIONS],
    };

    return {
      module: EncryptionModule,
      global: moduleGlobal,
      providers: [optionsProvider, serviceProvider],
      exports: [EncryptionService],
    };
  }

  static forRootAsync(options: {
    imports?: ModuleMetadata['imports'];
    useFactory: (...args: any[]) => Promise<Partial<KeyPair>> | Partial<KeyPair>;
    inject?: any[];
    global?: boolean;
  }): DynamicModule {
    const moduleGlobal = options.global ?? true;
    const optionsProvider: Provider = {
      provide: ENCRYPTION_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const serviceProvider: Provider = {
      provide: EncryptionService,
      useFactory: (appConfig: AppConfigService, opts: Partial<KeyPair>) =>
        new EncryptionService(appConfig, opts),
      inject: [AppConfigService, ENCRYPTION_OPTIONS],
    };

    return {
      module: EncryptionModule,
      imports: options.imports || [],
      global: moduleGlobal,
      providers: [optionsProvider, serviceProvider],
      exports: [EncryptionService],
    };
  }
}
