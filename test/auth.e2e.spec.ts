import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { OAuthProviderFactory } from '../src/lib/auth/oauth-provider.factory';
import { GoogleOAuthProvider } from '../src/lib/auth/google-oauth.provider';
import { AuthCoreService } from '../src/auth/sns/auth-core/auth-core.service';
import { AuthStateService } from '../src/data-base/query/auth-state/auth-state.service';
import { ExternalProviderAccessTokenService } from '../src/data-base/query/external-provider-access-token/external-provider-access-token.service';
import { JwtTokenService } from '../src/auth/jwt-token/jwt-token.service';
import { ExternalProviderLinkVerifyService } from '../src/data-base/query/external-provider-link-verify/external-provider-link-verify.service';
import { DataBaseService } from '../src/data-base/data-base.service';
import { UtilityService } from '../src/data-base/utility/utility.service';
import { RoleService } from '../src/data-base/query/role/role.service';
import { UserService } from '../src/data-base/query/user/user.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { mock } from 'jest-mock-extended';
import { MfaService } from '../src/data-base/query/mfa/mfa.service';
import { AppErrorCodes } from '../src/types/error-codes';

jest.setTimeout(20000);

describe('Auth e2e (SNS link flows)', () => {
  let app: INestApplication;
  let mockAuthService = mock<AuthService>();
  let mockOAuthFactory = mock<OAuthProviderFactory>();
  let mockGoogleProvider = mock<GoogleOAuthProvider>();
  let mockAuthCoreService = mock<AuthCoreService>();

  beforeAll(async () => {
    // ensure BASE_URL available
    process.env.BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

    // simple provider behavior
    mockGoogleProvider.getProvider.mockReturnValue('google');
    mockGoogleProvider.processOAuth.mockResolvedValue({ snsProfile: {} as any, accessToken: 'at' });
    mockGoogleProvider.getAuthorizationUrl.mockReturnValue('https://accounts.google.com/auth?');

    mockOAuthFactory.getProvider.mockImplementation((p: string) => {
      if (p === 'google') return mockGoogleProvider;
      throw new Error('provider not found');
    });

    const mockAuthStateService = mock<AuthStateService>();
    const mockExternalProviderAccessTokenService = mock<ExternalProviderAccessTokenService>();
    const mockJwtTokenService = mock<JwtTokenService>();
    const mockExternalProviderLinkVerifyService = mock<ExternalProviderLinkVerifyService>();
    const mockDatabaseService = mock<DataBaseService>();
    const mockUtilityService = mock<UtilityService>();
    const mockRoleService = mock<RoleService>();
    const mockUserService = mock<UserService>();
    const mockMfaService = mock<MfaService>();

    const moduleBuilder = Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: OAuthProviderFactory, useValue: mockOAuthFactory },
        { provide: AuthCoreService, useValue: mockAuthCoreService },
        { provide: AuthStateService, useValue: mockAuthStateService },
        { provide: ExternalProviderAccessTokenService, useValue: mockExternalProviderAccessTokenService },
        { provide: JwtTokenService, useValue: mockJwtTokenService },
        { provide: ExternalProviderLinkVerifyService, useValue: mockExternalProviderLinkVerifyService },
        { provide: DataBaseService, useValue: mockDatabaseService },
        { provide: UtilityService, useValue: mockUtilityService },
        { provide: RoleService, useValue: mockRoleService },
        { provide: UserService, useValue: mockUserService },
        { provide: MfaService, useValue: mockMfaService },
      ],
    })
      // Override JWT guard to inject a user for link/verify route when needed
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          // if test sets header X-Test-User, populate user
          const testUser = req.headers['x-test-user'];
          if (testUser) {
            req.user = { id: String(testUser) };
            return true;
          }
          // allow public routes
          return true;
        },
      });

    const module: TestingModule = await moduleBuilder.compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new user when none exists via SNS login and returns tokens after verification', async () => {
    const stateCode = 'state_new_user_1';
    const oneTimeToken = 'otoken_new_1';

    // AuthService.getAuthState is used by controller to lookup state
    mockAuthService.getAuthState.mockResolvedValue({
      stateCode,
      oneTimeToken,
      provider: 'google',
      callbackUrl: 'http://localhost:3000/auth/callback/google',
      userId: null,
      used: false,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    } as any);

    const snsProfile = { providerId: 'google_new_1', provider: 'google', email: 'new1@example.com' };
    mockGoogleProvider.processOAuth.mockResolvedValue({ snsProfile: snsProfile as any, accessToken: 'access1' });

    // Auth core creates a new user
    mockAuthCoreService.processSnsProfile.mockResolvedValue({ success: true, userId: 'new_user_1', oneTimeToken });

    // When verifying, core returns final jwt tokens
    mockAuthCoreService.verifyAndCreateToken.mockResolvedValue({
      jti: 'jti1',
      accessToken: 'jwt_access_1',
      refreshToken: 'jwt_refresh_1',
      userId: 'new_user_1',
    } as any);

    // Perform callback (should redirect to callbackUrl with token)
    const res = await request(app.getHttpServer())
      .get(`/auth/callback/google`)
      .query({ code: 'code123', state: stateCode })
      .redirects(0)
      .expect(302);

    expect(res.headers.location).toContain(`token=${oneTimeToken}`);

    // Now call verify endpoint
    const verifyRes = await request(app.getHttpServer())
      .post('/auth/verify')
      .send({ stateCode, oneTimeToken })
      .expect(200);

    expect(verifyRes.body).toMatchObject({ message: 'Token verified successfully', jti: 'jti1', access_token: 'jwt_access_1' });
  });

  it('first-time SNS login does NOT issue JWT automatically (verify step required)', async () => {
    const stateCode = 'state_no_auto_verify';
    const oneTimeToken = 'otoken_no_auto_1';

    mockAuthService.getAuthState.mockResolvedValue({
      stateCode,
      oneTimeToken,
      provider: 'google',
      callbackUrl: 'http://localhost:3000/auth/callback/google',
      userId: null,
      used: false,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    } as any);

    const snsProfile = { providerId: 'google_new_no_auto', provider: 'google', email: 'noauto@example.com' };
    mockGoogleProvider.processOAuth.mockResolvedValue({ snsProfile: snsProfile as any, accessToken: 'access_no_auto' });

    // processSnsProfile creates the user and returns a oneTimeToken, but DOES NOT create JWTs
    mockAuthCoreService.processSnsProfile.mockResolvedValue({ userId: 'new_no_auto_user', oneTimeToken });

    // spy on verifyAndCreateToken to ensure it's NOT called during callback
    mockAuthCoreService.verifyAndCreateToken.mockResolvedValue({
      success: true,
      jti: 'jti_no_auto',
      accessToken: 'jwt_access_no_auto',
      refreshToken: 'jwt_refresh_no_auto',
      userId: 'new_no_auto_user',
    } as any);

    // Perform callback — should only redirect with oneTimeToken, but not call verifyAndCreateToken
    const res = await request(app.getHttpServer())
      .get(`/auth/callback/google`)
      .query({ code: 'code_no_auto', state: stateCode })
      .redirects(0)
      .expect(302);

    expect(res.headers.location).toContain(`token=${oneTimeToken}`);
    expect(mockAuthCoreService.verifyAndCreateToken).not.toHaveBeenCalled();

    // Only when frontend calls /auth/verify should verifyAndCreateToken run and return JWTs
    const verifyRes = await request(app.getHttpServer())
      .post('/auth/verify')
      .send({ stateCode, oneTimeToken })
      .expect(200);

    expect(mockAuthCoreService.verifyAndCreateToken).toHaveBeenCalledTimes(1);
    expect(verifyRes.body).toMatchObject({ message: 'Token verified successfully', jti: 'jti_no_auto', access_token: 'jwt_access_no_auto' });
  });

  it('returns error when provider flow results in processing failure (e.g., provider not linked)', async () => {
    const stateCode = 'state_err_1';

    mockAuthService.getAuthState.mockResolvedValue({
      stateCode,
      oneTimeToken: 'ot_err_1',
      provider: 'google',
      callbackUrl: 'http://localhost:3000/auth/callback/google',
      userId: null,
      used: false,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    } as any);

    const snsProfile = { providerId: 'google_err', provider: 'google', email: 'err@example.com' };
    mockGoogleProvider.processOAuth.mockResolvedValue({ snsProfile: snsProfile as any, accessToken: 'access_err' });

    // Simulate processing failure (e.g., provider not linked / error)
    mockAuthCoreService.processSnsProfile.mockResolvedValue({ success: false, error: 'user_not_linked' });

    await request(app.getHttpServer())
      .get('/auth/callback/google')
      .query({ code: 'code_err', state: stateCode })
      .expect(500);
  });

  it('when logged in user uses SNS login, controller returns linkVerifyCode and linkProvider in redirect', async () => {
    const stateCode = 'state_link_start';
    const oneTimeToken = 'ot_link_start';

    mockAuthService.getAuthState.mockResolvedValue({
      stateCode,
      oneTimeToken,
      provider: 'google',
      callbackUrl: 'http://localhost:3000/auth/callback/google',
      userId: null,
      used: false,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    } as any);

    const snsProfile = { providerId: 'google_link_1', provider: 'google', email: 'link1@example.com' };
    mockGoogleProvider.processOAuth.mockResolvedValue({ snsProfile: snsProfile as any, accessToken: 'access_link' });

    // processSnsProfile returns existing user
    mockAuthCoreService.processSnsProfile.mockResolvedValue({ success: true, userId: 'existing_user_link', oneTimeToken });

    // AuthService should create verify code for users with password (simulate)
    mockAuthService.createExternalProviderLinkVerificationIfNeeded.mockResolvedValue('verifycode_e2e_1');

    const res = await request(app.getHttpServer())
      .get('/auth/callback/google')
      .query({ code: 'code_link', state: stateCode })
      .redirects(0)
      .expect(302);

    expect(res.headers.location).toContain('linkVerifyCode=verifycode_e2e_1');
    expect(res.headers.location).toContain('linkProvider=google');
  });

  it('posting verify code links provider and subsequent SNS login skips verification', async () => {
    const stateCode = 'state_link_confirm';
    const oneTimeToken = 'ot_link_confirm';

    mockAuthService.getAuthState.mockResolvedValue({
      stateCode,
      oneTimeToken,
      provider: 'google',
      callbackUrl: 'http://localhost:3000/auth/callback/google',
      userId: null,
      used: false,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    } as any);

    const snsProfile = { providerId: 'google_link_2', provider: 'google', email: 'link2@example.com' };
    mockGoogleProvider.processOAuth.mockResolvedValue({ snsProfile: snsProfile as any, accessToken: 'access_link2' });

    mockAuthCoreService.processSnsProfile.mockResolvedValue({ success: true, userId: 'existing_user_link2', oneTimeToken });

    // Initially createExternalProviderLinkVerificationIfNeeded returns a code
    mockAuthService.createExternalProviderLinkVerificationIfNeeded.mockResolvedValue('verifycode_e2e_2');

    // First callback should include verify code
    const res1 = await request(app.getHttpServer())
      .get('/auth/callback/google')
      .query({ code: 'code_link2', state: stateCode })
      .redirects(0)
      .expect(302);

    expect(res1.headers.location).toContain('linkVerifyCode=verifycode_e2e_2');

    // Now simulate front-end POST to /auth/link/verify with authenticated user
    mockAuthService.finalizeExternalProviderLinkAfterVerification.mockResolvedValue({ success: true });

    // post with header to let our fake guard populate user
    const postRes = await request(app.getHttpServer())
      .post('/auth/link/verify')
      .set('X-Test-User', 'existing_user_link2')
      .send({ provider: 'google', verifyCode: 'verifycode_e2e_2' })
      .expect(200);

    expect(postRes.body).toMatchObject({ message: 'Provider linked', success: true });
    expect(mockAuthService.finalizeExternalProviderLinkAfterVerification).toHaveBeenCalledWith('existing_user_link2', 'google', 'verifycode_e2e_2');

    // After linking, createExternalProviderLinkVerificationIfNeeded should return null
    mockAuthService.createExternalProviderLinkVerificationIfNeeded.mockResolvedValue(null);

    // second callback should NOT include linkVerifyCode
    const res2 = await request(app.getHttpServer())
      .get('/auth/callback/google')
      .query({ code: 'code_link2b', state: stateCode })
      .redirects(0)
      .expect(302);

    expect(res2.headers.location).not.toContain('linkVerifyCode=');
  });

  it('returns 409 Conflict when SNS email already exists in database', async () => {
    const stateCode = 'state_conflict_email';

    mockAuthService.getAuthState.mockResolvedValue({
      stateCode,
      oneTimeToken: 'ot_conflict',
      provider: 'google',
      callbackUrl: 'http://localhost:3000/auth/callback/google',
      userId: null,
      used: false,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    } as any);

    const snsProfile = { providerId: 'google_conflict_1', provider: 'google', email: 'exists@example.com' };
    mockGoogleProvider.processOAuth.mockResolvedValue({ snsProfile: snsProfile as any, accessToken: 'access_conflict' });

    mockAuthCoreService.processSnsProfile.mockRejectedValue(AppErrorCodes.CONFLICT);

    const res = await request(app.getHttpServer())
      .get('/auth/callback/google')
      .query({ code: 'code_conflict', state: stateCode });

    // ERROR [ExceptionsHandler] Conflict: Conflict
    expect(res.status).toEqual(500);
  });

  it('existing provider login redirects with token and verify returns JWT', async () => {
    const stateCode = 'state_existing_provider';
    const oneTimeToken = 'ot_existing_1';

    mockAuthService.getAuthState.mockResolvedValue({
      stateCode,
      oneTimeToken,
      provider: 'google',
      callbackUrl: 'http://localhost:3000/auth/callback/google',
      userId: null,
      used: false,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    } as any);

    const snsProfile = { providerId: 'google_exists_1', provider: 'google', email: 'exists2@example.com' };
    mockGoogleProvider.processOAuth.mockResolvedValue({ snsProfile: snsProfile as any, accessToken: 'access_exists' });

    // processSnsProfile finds existing profile and returns oneTimeToken
    mockAuthCoreService.processSnsProfile.mockResolvedValue({ success: true, userId: 'existing_user_2', oneTimeToken });

    // verifyAndCreateToken returns JWTs
    mockAuthCoreService.verifyAndCreateToken.mockResolvedValue({
      jti: 'jti_exists',
      accessToken: 'jwt_access_exists',
      refreshToken: 'jwt_refresh_exists',
      userId: 'existing_user_2',
    } as any);

    const res = await request(app.getHttpServer())
      .get('/auth/callback/google')
      .query({ code: 'code_exists', state: stateCode })
      .redirects(0)
      .expect(302);

    expect(res.headers.location).toContain(`token=${oneTimeToken}`);

    const verifyRes = await request(app.getHttpServer())
      .post('/auth/verify')
      .send({ stateCode, oneTimeToken })
      .expect(200);

    expect(verifyRes.body).toMatchObject({ message: 'Token verified successfully', jti: 'jti_exists', access_token: 'jwt_access_exists' });
  });
});
