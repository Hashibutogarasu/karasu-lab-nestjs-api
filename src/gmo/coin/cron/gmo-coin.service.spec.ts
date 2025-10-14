import { Test, TestingModule } from '@nestjs/testing';
import { GmoCoinCronService } from './gmo-coin-cron.service';
import { CoinService } from '../coin.service';
import { getGlobalModule } from '../../../utils/test/global-modules';

describe('GmoCoinCronService', () => {
  let service: GmoCoinCronService;

  beforeEach(async () => {
    const module: TestingModule = await getGlobalModule({
      providers: [GmoCoinCronService, CoinService],
    }).compile();

    service = module.get<GmoCoinCronService>(GmoCoinCronService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
