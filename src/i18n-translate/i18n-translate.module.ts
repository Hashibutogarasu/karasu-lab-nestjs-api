import { Module } from '@nestjs/common';
import { I18nTranslateService } from './i18n-translate.service';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from '../app-config/app-config.service';
import { AppConfigModule } from '../app-config/app-config.module';

@Module({
  imports: [
    AppConfigModule,
    I18nModule.forRootAsync({
      useFactory: (configService: AppConfigService) => ({
        fallbackLanguage: configService.get('i18nDefaultLanguage'),
        loaderOptions: {
          path: path.join(__dirname, '../../i18n/'),
          watch: true,
        },
        typesOutputPath: path.join(
          __dirname,
          '../../src/generated/i18n.generated.ts',
        ),
      }),
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
        new HeaderResolver(['x-lang']),
      ],
      inject: [ConfigService],
    }),
  ],
  providers: [I18nTranslateService],
  exports: [I18nTranslateService],
})
export class I18nTranslateModule {}
