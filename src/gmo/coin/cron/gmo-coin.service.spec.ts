import { Test, TestingModule } from '@nestjs/testing';
import { GmoCoinCronService } from './gmo-coin-cron.service';
import { CoinService } from '../coin.service';
import { getGlobalModule } from '../../../utils/test/global-modules';
import { mock } from 'jest-mock-extended';
import { GmocoinService } from '../../../data-base/query/gmocoin/gmocoin.service';
import { DataBaseService } from '../../../data-base/data-base.service';
import { UtilityService } from '../../../data-base/utility/utility.service';
import { RoleService } from '../../../data-base/query/role/role.service';

describe('GmoCoinCronService', () => {
  let service: GmoCoinCronService;

  beforeEach(async () => {
    const mockGmoCoinService = mock<GmocoinService>();
    const mockDatabaseService = mock<DataBaseService>();
    const mockUtilityService = mock<UtilityService>();
    const mockRoleService = mock<RoleService>();

    const module: TestingModule = await getGlobalModule({
      providers: [
        GmoCoinCronService,
        CoinService,
        {
          provide: GmocoinService,
          useValue: mockGmoCoinService,
        },
        {
          provide: DataBaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: UtilityService,
          useValue: mockUtilityService,
        },
        {
          provide: RoleService,
          useValue: mockRoleService,
        },
      ],
    }).compile();

    service = module.get<GmoCoinCronService>(GmoCoinCronService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
