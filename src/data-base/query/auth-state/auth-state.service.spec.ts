import { Test, TestingModule } from '@nestjs/testing';
import { AuthStateService } from './auth-state.service';
import { mock } from 'jest-mock-extended';
import { DataBaseService } from '../../data-base.service';

describe('AuthStateService', () => {
  let service: AuthStateService;

  beforeEach(async () => {
    const mockDatabaseService = mock<DataBaseService>();

    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        AuthStateService,
        { provide: DataBaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<AuthStateService>(AuthStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
