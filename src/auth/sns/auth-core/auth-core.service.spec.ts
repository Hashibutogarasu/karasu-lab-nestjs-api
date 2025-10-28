import { Test, TestingModule } from '@nestjs/testing';
import { AuthCoreService } from './auth-core.service';
// import { DataBaseModule } from '../../../data-base/data-base.module';
import { mock } from 'jest-mock-extended';
import { JwtTokenService } from '../../jwt-token/jwt-token.service';
import { JwtstateService } from '../../../data-base/query/jwtstate/jwtstate.service';
import { UtilityService } from '../../../data-base/utility/utility.service';
import { AuthStateService } from '../../../data-base/query/auth-state/auth-state.service';
import { UserService } from '../../../data-base/query/user/user.service';
import { ExtraProfileService } from '../../../data-base/query/extra-profile/extra-profile.service';
import { SnsAuthCallback } from '../../../lib/auth/sns-auth';
import { OAuthProviderFactory } from '../../../lib/auth/oauth-provider.factory';
import { GoogleOAuthProvider } from '../../../lib/auth/google-oauth.provider';
import { DiscordOAuthProvider } from '../../../lib/auth/discord-oauth.provider';
import { XOAuthProvider } from '../../../lib/auth/x-oauth.provider';

describe('CoreService', () => {
  let service: AuthCoreService;

  beforeEach(async () => {
    const mockUtilityService = mock<UtilityService>();
    const mockAuthStateService = mock<AuthStateService>();
    const mockUserService = mock<UserService>();
    const mockExtraProfileService = mock<ExtraProfileService>();
    const mockJwtTokenService = mock<JwtTokenService>();
    const mockJwtStateService = mock<JwtstateService>();
    const mockSnsAuthCallback = mock<SnsAuthCallback>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthCoreService,
        { provide: UtilityService, useValue: mockUtilityService },
        { provide: AuthStateService, useValue: mockAuthStateService },
        { provide: UserService, useValue: mockUserService },
        { provide: ExtraProfileService, useValue: mockExtraProfileService },
        { provide: JwtTokenService, useValue: mockJwtTokenService },
        { provide: JwtstateService, useValue: mockJwtStateService },
        { provide: SnsAuthCallback, useValue: mockSnsAuthCallback },
        OAuthProviderFactory,
        GoogleOAuthProvider,
        DiscordOAuthProvider,
        XOAuthProvider,
      ],
    }).compile();

    service = module.get<AuthCoreService>(AuthCoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
