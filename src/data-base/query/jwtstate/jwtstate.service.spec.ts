import { Test, TestingModule } from '@nestjs/testing';
import { JwtstateService } from './jwtstate.service';
import { mock } from 'jest-mock-extended';
import { DataBaseService } from '../../data-base.service';
import { JwtTokenService } from '../../../auth/jwt-token/jwt-token.service';

describe('JwtstateService', () => {
  let service: JwtstateService;

  beforeEach(async () => {
    const mockDatabaseService = mock<DataBaseService>();
    const mockJwtTokenService = mock<JwtTokenService>();

    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        JwtstateService,
        { provide: DataBaseService, useValue: mockDatabaseService },
        { provide: JwtTokenService, useValue: mockJwtTokenService },
      ],
    }).compile();

    service = module.get<JwtstateService>(JwtstateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
