import { Test, TestingModule } from '@nestjs/testing';
import { UtilityService } from './utility.service';
import { DataBaseService } from '../data-base.service';
import { mock } from 'jest-mock-extended';

describe('UtilityService', () => {
  let service: UtilityService;

  beforeEach(async () => {
    const mockDataBaseService = mock<DataBaseService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UtilityService,
        { provide: DataBaseService, useValue: mockDataBaseService },
      ],
    }).compile();

    service = module.get<UtilityService>(UtilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
