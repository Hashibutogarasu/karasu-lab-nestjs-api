import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { mock } from 'jest-mock-extended';
import { DataBaseService } from '../../data-base.service';

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(async () => {
    const mockDataBaseService = mock<DataBaseService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: DataBaseService, useValue: mockDataBaseService },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
