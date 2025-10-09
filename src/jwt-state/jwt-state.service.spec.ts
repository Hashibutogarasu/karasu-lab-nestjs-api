import { Test, TestingModule } from '@nestjs/testing';
import { JwtStateService } from './jwt-state.service';

describe('JwtStateService', () => {
  let service: JwtStateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStateService],
    }).compile();

    service = module.get<JwtStateService>(JwtStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
