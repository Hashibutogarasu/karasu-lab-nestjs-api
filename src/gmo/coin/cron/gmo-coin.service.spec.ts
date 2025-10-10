import { Test, TestingModule } from '@nestjs/testing';
import { GmoCoinCronService } from './gmo-coin-cron.service';
import { CoinService } from '../coin.service';

describe('GmoCoinCronService', () => {
  let service: GmoCoinCronService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GmoCoinCronService, CoinService],
    }).compile();

    service = module.get<GmoCoinCronService>(GmoCoinCronService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
