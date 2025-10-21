import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationCodeService } from './authorization-code.service';
import { DataBaseModule } from '../../data-base.module';
import { mock } from 'jest-mock-extended';
import { DataBaseService } from '../../data-base.service';
import { UtilityService } from '../../utility/utility.service';

describe('AuthorizationCodeService', () => {
  let service: AuthorizationCodeService;

  beforeEach(async () => {
    const mockDatabaseService = mock<DataBaseService>();
    const mockUtilityService = mock<UtilityService>();

    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        AuthorizationCodeService,
        { provide: DataBaseService, useValue: mockDatabaseService },
        { provide: UtilityService, useValue: mockUtilityService },
      ],
    }).compile();

    service = module.get<AuthorizationCodeService>(AuthorizationCodeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
