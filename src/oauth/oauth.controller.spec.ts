import { Test, TestingModule } from '@nestjs/testing';
import { OauthController } from './oauth.controller';
import { mock } from 'jest-mock-extended';
import { OauthService } from './oauth.service';
import { JwtTokenService } from '../auth/jwt-token/jwt-token.service';
import { UserService } from '../data-base/query/user/user.service';
import { JwtstateService } from '../data-base/query/jwtstate/jwtstate.service';
import { AppConfigService } from '../app-config/app-config.service';
import { DataBaseService } from '../data-base/data-base.service';
import { UtilityService } from '../data-base/utility/utility.service';
import { RoleService } from '../data-base/query/role/role.service';
import { APP_CONFIG } from '../app-config/app-config.constants';
import { PermissionBitcalcService } from '../permission-bitcalc/permission-bitcalc.service';

describe('OauthController', () => {
  let controller: OauthController;

  beforeEach(async () => {
    const mockoAuthService = mock<OauthService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OauthController],
      providers: [
        {
          provide: OauthService,
          useValue: mockoAuthService,
        },
        JwtTokenService,
        UserService,
        JwtstateService,
        AppConfigService,
        {
          provide: APP_CONFIG,
          useValue: {},
        },
        DataBaseService,
        UtilityService,
        RoleService,
        PermissionBitcalcService,
      ],
    }).compile();

    controller = module.get<OauthController>(OauthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
