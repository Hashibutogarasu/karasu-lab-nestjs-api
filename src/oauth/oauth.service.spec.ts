import { Test, TestingModule } from '@nestjs/testing';
import { OauthService } from './oauth.service';
import { PermissionService } from '../permission/permission.service';
import { PermissionBitcalcService } from '../permission-bitcalc/permission-bitcalc.service';
import { AppConfigService } from '../app-config/app-config.service';
import { APP_CONFIG } from '../app-config/app-config.constants';
import { OauthClientService } from '../data-base/query/oauth-client/oauth-client.service';
import { DataBaseService } from '../data-base/data-base.service';
import { OauthGrantedTokenService } from '../data-base/query/oauth-granted-token/oauth-granted-token.service';
import { JwtTokenService } from '../auth/jwt-token/jwt-token.service';
import { UserService } from '../data-base/query/user/user.service';
import { JwtstateService } from '../data-base/query/jwtstate/jwtstate.service';
import { UtilityService } from '../data-base/utility/utility.service';
import { RoleService } from '../data-base/query/role/role.service';
import { AuthorizationCodeService } from '../data-base/query/authorization-code/authorization-code.service';

describe('OauthService', () => {
  let service: OauthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataBaseService,
        OauthService,
        OauthClientService,
        OauthGrantedTokenService,
        JwtTokenService,
        UserService,
        JwtstateService,
        PermissionService,
        PermissionBitcalcService,
        UtilityService,
        RoleService,
        AppConfigService,
        AuthorizationCodeService,
        {
          provide: APP_CONFIG,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<OauthService>(OauthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
