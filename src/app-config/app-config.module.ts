import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration, {
  configSchema,
  Configuration,
} from '../config/configuration';
import { AppConfigService } from './app-config.service';
import { APP_CONFIG } from './app-config.constants';

export type AppConfig = ReturnType<typeof configuration>;

@Module({
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {
  static forRoot(): DynamicModule {
    const validated = configSchema.parse(process.env) as Configuration;
    const appValue: AppConfig = configuration(validated);

    const appConfigProvider: Provider = {
      provide: APP_CONFIG,
      useValue: appValue,
    };

    return {
      module: AppConfigModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ app: appValue })],
        }),
      ],
      providers: [appConfigProvider, AppConfigService],
      exports: [
        appConfigProvider,
        {
          global: true,
          module: AppConfigModule,
        },
      ],
      global: true,
    };
  }
}
