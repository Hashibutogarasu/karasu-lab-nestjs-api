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
import { I18nTranslateService } from '../i18n-translate/i18n-translate.service';
import { mock } from 'jest-mock-extended';

describe('OauthService', () => {
  let service: OauthService;

  beforeEach(async () => {
    const mockPermissionService = mock<PermissionService>();
    const mockPermissionBitcalcService = mock<PermissionBitcalcService>();
    const mockOAuthClientService = mock<OauthClientService>();
    const mockOAuthGrantedTokenService = mock<OauthGrantedTokenService>({
      create: jest.fn().mockResolvedValue({
        jti: 'jti',
      }),
      encodeGrantedJWT: jest.fn().mockResolvedValue('access-token'),
    });
    const mockAuthorizationCodeService = mock<AuthorizationCodeService>({
      createAuthorizationCode: jest.fn().mockResolvedValue('code'),
    });
    const mockUserService = mock<UserService>();
    const mockJwtTokenService = mock<JwtTokenService>();
    const mockAppConfigService = mock<AppConfigService>();
    const mockI18nTranslateService = mock<I18nTranslateService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OauthService,
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
        {
          provide: PermissionBitcalcService,
          useValue: mockPermissionBitcalcService,
        },
        {
          provide: OauthClientService,
          useValue: mockOAuthClientService,
        },
        {
          provide: OauthGrantedTokenService,
          useValue: mockOAuthGrantedTokenService,
        },
        {
          provide: AuthorizationCodeService,
          useValue: mockAuthorizationCodeService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtTokenService,
          useValue: mockJwtTokenService,
        },
        {
          provide: AppConfigService,
          useValue: mockAppConfigService,
        },
        {
          provide: I18nTranslateService,
          useValue: mockI18nTranslateService,
        },
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
