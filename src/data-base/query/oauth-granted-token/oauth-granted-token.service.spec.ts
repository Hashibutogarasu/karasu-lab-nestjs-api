import { Test, TestingModule } from '@nestjs/testing';
import { OauthGrantedTokenService } from './oauth-granted-token.service';
import { JwtTokenService } from '../../../auth/jwt-token/jwt-token.service';
import { DataBaseService } from '../../data-base.service';
import { AppConfigService } from '../../../app-config/app-config.service';
import { APP_CONFIG } from '../../../app-config/app-config.constants';
import { UserService } from '../user/user.service';
import { JwtstateService } from '../jwtstate/jwtstate.service';
import { UtilityService } from '../../utility/utility.service';
import { RoleService } from '../role/role.service';
import { PermissionBitcalcService } from '../../../permission-bitcalc/permission-bitcalc.service';

describe('OauthGrantedTokenService', () => {
  let service: OauthGrantedTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OauthGrantedTokenService,
        JwtTokenService,
        DataBaseService,
        AppConfigService,
        {
          provide: APP_CONFIG,
          useValue: {},
        },
        UserService,
        JwtstateService,
        UtilityService,
        RoleService,
        PermissionBitcalcService,
      ],
    }).compile();

    service = module.get<OauthGrantedTokenService>(OauthGrantedTokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
