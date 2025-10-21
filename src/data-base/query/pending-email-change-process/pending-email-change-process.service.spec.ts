import { Test, TestingModule } from '@nestjs/testing';
import { PendingEmailChangeProcessService } from './pending-email-change-process.service';
import { mock } from 'jest-mock-extended';
import { DataBaseService } from '../../data-base.service';
import { UtilityService } from '../../utility/utility.service';

describe('PendingEmailChangeProcessService', () => {
  let service: PendingEmailChangeProcessService;

  beforeEach(async () => {
    const mockDatabaseService = mock<DataBaseService>();
    const mockUtilityService = mock<UtilityService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PendingEmailChangeProcessService,
        {
          provide: DataBaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: UtilityService,
          useValue: mockUtilityService,
        },
      ],
    }).compile();

    service = module.get<PendingEmailChangeProcessService>(
      PendingEmailChangeProcessService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
