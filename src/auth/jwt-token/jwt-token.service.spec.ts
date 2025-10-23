import { Test, TestingModule } from '@nestjs/testing';
import { JwtTokenService } from './jwt-token.service';
import { UserService } from '../../data-base/query/user/user.service';
import { mock } from 'jest-mock-extended';
import { JwtstateService } from '../../data-base/query/jwtstate/jwtstate.service';
import { AppConfigService } from '../../app-config/app-config.service';
import { AppConfigModule } from '../../app-config/app-config.module';
import { APP_CONFIG } from '../../app-config/app-config.constants';

describe('JwtTokenService', () => {
  let service: JwtTokenService;
  let mockUserService: UserService;
  let mockJwtStateService: JwtstateService;

  beforeEach(async () => {
    mockUserService = mock<UserService>();
    mockJwtStateService = mock<JwtstateService>();

    const mockConfigService = mock<AppConfigService>({
      get: jest.fn().mockResolvedValue({}),
    });

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppConfigModule],
      providers: [
        JwtTokenService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtstateService,
          useValue: mockJwtStateService,
        },
        {
          provide: APP_CONFIG,
          useValue: mockConfigService,
        },
      ],
    })
      .overrideProvider(AppConfigService)
      .useValue(mockConfigService)
      .compile();

    service = module.get<JwtTokenService>(JwtTokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
