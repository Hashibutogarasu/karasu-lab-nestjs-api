import { Global, Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG } from './app-config.constants';
import type { AppConfig } from './app-config.module';

@Injectable()
@Global()
export class AppConfigService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) { }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }
}
