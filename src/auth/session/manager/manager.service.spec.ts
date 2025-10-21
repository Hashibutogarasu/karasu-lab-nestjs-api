import { Test, TestingModule } from '@nestjs/testing';
import { ManagerService } from './manager.service';
import { mock } from 'jest-mock-extended';
import { UtilityService } from '../../../data-base/utility/utility.service';

describe('ManagerService', () => {
  let service: ManagerService;

  beforeEach(async () => {
    const mockUtilityService = mock<UtilityService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManagerService,
        { provide: UtilityService, useValue: mockUtilityService },
      ],
    }).compile();

    service = module.get<ManagerService>(ManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
