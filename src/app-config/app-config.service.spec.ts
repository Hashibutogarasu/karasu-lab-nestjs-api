import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from './app-config.service';
import { APP_CONFIG } from './app-config.constants';

describe('AppConfigService', () => {
  let service: AppConfigService;

  beforeEach(async () => {
    const mockConfig = {
      port: 3000,
      baseUrl: 'http://localhost:3000',
      issuerUrl: 'http://localhost:3000',
      jwtSecret: 'change_me',
      redis: { host: 'localhost', port: 6379 },
      database: {
        url: undefined,
        directUrl: undefined,
        host: 'localhost',
        port: 5432,
      },
      dify: { apiKey: undefined },
      oauth: {
        google: { clientId: undefined, clientSecret: undefined },
        discord: { clientId: undefined, clientSecret: undefined },
        x: { clientId: undefined, clientSecret: undefined },
      },
      encryption: { privateKey: undefined, publicKey: undefined },
    } as const;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        {
          provide: APP_CONFIG,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
