import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { BaseService } from '../impl/base-service';
import { AppConfigService } from '../app-config/app-config.service';

@Injectable()
export class I18nTranslateService extends BaseService {
  constructor(
    private readonly i18n: I18nService,
    readonly appConfigService: AppConfigService,
  ) {
    super(appConfigService);
  }

  text(key: string) {
    return this.i18n.translate(key);
  }

  scopeText(path: string, locale?: string): string {
    if (!path) return path;
    const i18nKey = `scopes.${path.split(':').join('.')}`;
    try {
      return locale
        ? this.i18n.translate(i18nKey, { lang: locale })
        : this.i18n.translate(i18nKey);
    } catch (e) {
      return path;
    }
  }
}
