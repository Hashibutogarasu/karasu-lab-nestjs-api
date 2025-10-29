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
import { mock } from 'jest-mock-extended';
import { EncryptionService } from '../../../encryption/encryption.service';

describe('OauthGrantedTokenService', () => {
  let service: OauthGrantedTokenService;

  beforeEach(async () => {
    const mockEncryptionService = mock<EncryptionService>();

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
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        }
      ],
    }).compile();

    service = module.get<OauthGrantedTokenService>(OauthGrantedTokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
