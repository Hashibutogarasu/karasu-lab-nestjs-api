import { Test, TestingModule } from '@nestjs/testing';
import { OauthClientService } from './oauth-client.service';
import { DataBaseService } from '../../data-base.service';
import { mock } from 'jest-mock-extended';
import { AppConfigService } from '../../../app-config/app-config.service';
import { APP_CONFIG } from '../../../app-config/app-config.constants';
import { UtilityService } from '../../utility/utility.service';

describe('OauthClientService', () => {
  let service: OauthClientService;

  beforeEach(async () => {
    const mockDatabaseService = mock<DataBaseService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OauthClientService,
        UtilityService,
        { provide: DataBaseService, useValue: mockDatabaseService },
        AppConfigService,
        {
          provide: APP_CONFIG,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<OauthClientService>(OauthClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
