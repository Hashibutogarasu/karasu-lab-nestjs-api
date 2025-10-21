import { Test, TestingModule } from '@nestjs/testing';
import { ExtraProfileService } from './extra-profile.service';
import { mock } from 'jest-mock-extended';
import { DataBaseService } from '../../data-base.service';

describe('ExtraProfileService', () => {
  let service: ExtraProfileService;

  beforeEach(async () => {
    const mockDatabaseService = mock<DataBaseService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtraProfileService,
        { provide: DataBaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<ExtraProfileService>(ExtraProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
