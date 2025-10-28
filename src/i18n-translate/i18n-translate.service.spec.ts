import { Test, TestingModule } from '@nestjs/testing';
import { I18nTranslateService } from './i18n-translate.service';
import { mock } from 'jest-mock-extended';
import { I18nService } from 'nestjs-i18n';
import { AppConfigService } from '../app-config/app-config.service';
import { APP_CONFIG } from '../app-config/app-config.constants';

describe('I18nTranslateService', () => {
  let service: I18nTranslateService;

  beforeEach(async () => {
    const mockI18nService = mock<I18nService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        I18nTranslateService,
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        AppConfigService,
        {
          provide: APP_CONFIG,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<I18nTranslateService>(I18nTranslateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
