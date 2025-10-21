import { Test, TestingModule } from '@nestjs/testing';
import { JwtTokenService } from './jwt-token.service';
import { UserService } from '../../data-base/query/user/user.service';
import { mock } from 'jest-mock-extended';
import { JwtstateService } from '../../data-base/query/jwtstate/jwtstate.service';

describe('JwtTokenService', () => {
  let service: JwtTokenService;
  let mockUserService: UserService;
  let mockJwtStateService: JwtstateService;

  beforeEach(async () => {
    mockUserService = mock<UserService>();
    mockJwtStateService = mock<JwtstateService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtTokenService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtstateService,
          useValue: mockJwtStateService,
        },
      ],
    }).compile();

    service = module.get<JwtTokenService>(JwtTokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
