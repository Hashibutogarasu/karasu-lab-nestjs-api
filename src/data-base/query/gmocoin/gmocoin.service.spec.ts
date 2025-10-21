import { Test, TestingModule } from '@nestjs/testing';
import { GmocoinService } from './gmocoin.service';
import { DataBaseModule } from '../../data-base.module';
import { mock } from 'jest-mock-extended';
import { DataBaseService } from '../../data-base.service';

describe('GmocoinService', () => {
  let service: GmocoinService;

  beforeEach(async () => {
    const mockDatabaseService = mock<DataBaseService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GmocoinService,
        { provide: DataBaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<GmocoinService>(GmocoinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
