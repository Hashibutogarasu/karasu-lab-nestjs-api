import { Test, TestingModule } from '@nestjs/testing';
import { PersonalAccessTokenService } from './personal-access-token.service';

describe('PersonalAccessTokenService', () => {
  let service: PersonalAccessTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PersonalAccessTokenService],
    }).compile();

    service = module.get<PersonalAccessTokenService>(
      PersonalAccessTokenService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
