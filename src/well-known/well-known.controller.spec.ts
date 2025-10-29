import { Test, TestingModule } from '@nestjs/testing';
import { WellKnownController } from './well-known.controller';
import { mock } from 'jest-mock-extended';
import { AppConfigService } from '../app-config/app-config.service';
import { APP_CONFIG } from '../app-config/app-config.constants';

describe('WellKnownController', () => {
  let controller: WellKnownController;

  beforeEach(async () => {
    const mockAppConfigService = mock<AppConfigService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WellKnownController],
      providers: [
        { provide: AppConfigService, useValue: mockAppConfigService },
        {
          provide: APP_CONFIG,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<WellKnownController>(WellKnownController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
