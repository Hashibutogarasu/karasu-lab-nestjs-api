import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { OAuthProviderFactory } from '../lib/auth/oauth-provider.factory';
import { AppErrorCodes } from '../types/error-codes';
import { ExternalProviderAccessTokenService } from '../data-base/query/external-provider-access-token/external-provider-access-token.service';
import { mock, MockProxy } from 'jest-mock-extended';
import { JwtTokenService } from './jwt-token/jwt-token.service';
import { AuthStateService } from '../data-base/query/auth-state/auth-state.service';
import { DataBaseService } from '../data-base/data-base.service';
import { UtilityService } from '../data-base/utility/utility.service';
import { RoleService } from '../data-base/query/role/role.service';
import { AuthCoreService } from './sns/auth-core/auth-core.service';
import { UserService } from '../data-base/query/user/user.service';
import { WorkflowService } from './sns/workflow/workflow.service';
import { MfaService } from '../data-base/query/mfa/mfa.service';
import { DiscordOAuthProvider } from '../lib/auth/discord-oauth.provider';
import { GoogleOAuthProvider } from '../lib/auth/google-oauth.provider';
import * as crypto from 'crypto';
import { SessionService } from '../data-base/query/session/session.service';

describe('AuthController - SNS OAuth Authentication', () => {
  let controller: AuthController;
  let service: AuthService;
  let _savedBaseUrl: string | undefined;
  let _savedEncryptionPrivate: string | undefined;
  let _savedEncryptionPublic: string | undefined;

  // Mock Response object
  const mockStatusFn = jest.fn();
  const mockJsonFn = jest.fn();
  const mockRedirectFn = jest.fn();
  const mockResponse = {
    success: jest.fn().mockResolvedValue(true),
    status: mockStatusFn.mockReturnThis(),
    json: mockJsonFn.mockReturnThis(),
    redirect: mockRedirectFn,
  } as unknown as Response;

  // Mock Request object
  const mockRequest = {
    headers: {},
    ip: '127.0.0.1',
  } as unknown as Request;

  const mockAuthService = mock<AuthService>();

  const mockExternalProviderAccessTokenService =
    mock<ExternalProviderAccessTokenService>();
  const mockGoogleProvider = mock<GoogleOAuthProvider>({
    getProvider: jest.fn().mockRejectedValue('google'),
    getAuthorizationUrl: jest.fn().mockReturnValue(''),
    isAvailable: jest.fn().mockReturnValue(true),
  });

  const mockDiscordProvider = mock<DiscordOAuthProvider>({
    getProvider: jest.fn().mockReturnValue('discord'),
    getAuthorizationUrl: jest.fn().mockReturnValue(''),
    isAvailable: jest.fn().mockReturnValue(true),
  });

  const mockOAuthProviderFactory = mock<OAuthProviderFactory>({
    getProvider: jest.fn().mockImplementation((provider: string) => {
      if (provider === 'google') return mockGoogleProvider;
      if (provider === 'discord') return mockDiscordProvider;
      throw AppErrorCodes.PROVIDER_NOT_FOUND;
    }),
    getAllProviders: jest
      .fn()
      .mockReturnValue([mockGoogleProvider, mockDiscordProvider]),
    getAvailableProviderNames: jest.fn().mockReturnValue(['google', 'discord']),
    getConfiguredProviders: jest
      .fn()
      .mockReturnValue([mockGoogleProvider, mockDiscordProvider]),
  });

  let mockJwtTokenService: MockProxy<JwtTokenService>;
  let mockAuthStateService: MockProxy<AuthStateService>;
  let mockAuthCoreService: MockProxy<AuthCoreService>;
  let mockUserService: MockProxy<UserService>;
  let mockSnsWorkflowService: MockProxy<WorkflowService>;

  beforeEach(async () => {
    // Ensure BASE_URL is defined before creating the testing module so controller
    // and providers that read it during initialization get a defined value.
    _savedBaseUrl = process.env.BASE_URL;
    _savedEncryptionPrivate = process.env.ENCRYPTION_PRIVATE_KEY;
    _savedEncryptionPublic = process.env.ENCRYPTION_PUBLIC_KEY;

    process.env.BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    });

    process.env.ENCRYPTION_PRIVATE_KEY = Buffer.from(
      privateKey,
      'utf8',
    ).toString('base64');
    process.env.ENCRYPTION_PUBLIC_KEY = Buffer.from(publicKey, 'utf8').toString(
      'base64',
    );

    mockJwtTokenService = mock<JwtTokenService>();
    mockAuthStateService = mock<AuthStateService>();
    const mockDatabaseService = mock<DataBaseService>();
    const mockUtilityService = mock<UtilityService>();
    const mockRoleService = mock<RoleService>();
    mockAuthCoreService = mock<AuthCoreService>();
    mockAuthCoreService.verifyAndCreateToken.mockResolvedValue({
      success: true,
      jti: 'jwt_id_abc123',
      accessToken: 'access_token_abc123',
      refreshToken: 'refresh_token_abc123',
      userId: 'user_123',
      provider: 'email',
    });
    mockUserService = mock<UserService>();
    mockSnsWorkflowService = mock<WorkflowService>();
    const mockMfaService = mock<MfaService>();
    const mockSessionService = mock<SessionService>({
      create: jest.fn().mockResolvedValue({ id: 'session_1' }),
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ExternalProviderAccessTokenService,
          useValue: mockExternalProviderAccessTokenService,
        },
        {
          provide: OAuthProviderFactory,
          useValue: mockOAuthProviderFactory,
        },
        {
          provide: JwtTokenService,
          useValue: mockJwtTokenService,
        },
        {
          provide: AuthStateService,
          useValue: mockAuthStateService,
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
        {
          provide: AuthCoreService,
          useValue: mockAuthCoreService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: WorkflowService,
          useValue: mockSnsWorkflowService,
        },
        {
          provide: MfaService,
          useValue: mockMfaService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();

    // Reset mock response methods
    mockStatusFn.mockReturnThis();
    mockJsonFn.mockReturnThis();
    mockRedirectFn.mockReturnThis();

    // Reset provider mocks
    mockGoogleProvider.isAvailable.mockReturnValue(true);
    mockDiscordProvider.isAvailable.mockReturnValue(true);

    // Mock console.error to prevent test output pollution
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // restore original BASE_URL
    process.env.BASE_URL = _savedBaseUrl;
    process.env.ENCRYPTION_PRIVATE_KEY = _savedEncryptionPrivate;
    process.env.ENCRYPTION_PUBLIC_KEY = _savedEncryptionPublic;
  });

  describe('SNS Authentication State Management - POST /auth/state', () => {
    const validAuthStateDto = {
      provider: 'google',
      callbackUrl: 'http://localhost:3000/auth/callback/google',
    };

    it('should create authentication state successfully for Google', async () => {
      const expectedResult = {
        success: true,
        stateCode: 'state_abc123',
        redirectUrl: '',
      };

      const expectedRedirectUrl =
        'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&redirect_uri=http://localhost:3000/auth/callback/google&response_type=code&scope=openid%20profile%20email&state=state_abc123';

      mockAuthCoreService.createAuthenticationState.mockResolvedValue(
        expectedResult,
      );
      mockGoogleProvider.getAuthorizationUrl.mockReturnValue(
        expectedRedirectUrl,
      );
      mockAuthStateService.findAuthState.mockResolvedValue({
        id: 'auth_state_123',
        stateCode: 'state_abc123',
        oneTimeToken: 'one_time_token_123',
        provider: 'google',
        callbackUrl: 'http://localhost:3000/auth/callback/google',
        userId: null,
        codeVerifier: null,
        codeChallenge: null,
        codeChallengeMethod: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      });

      await controller.createAuthState(
        validAuthStateDto,
        mockResponse,
        mockRequest,
      );

      expect(
        mockAuthCoreService.createAuthenticationState,
      ).toHaveBeenCalledWith(validAuthStateDto, mockGoogleProvider);
      expect(mockGoogleProvider.getAuthorizationUrl).toHaveBeenCalled();
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockJsonFn).toHaveBeenCalledWith({
        message: 'Authentication state created successfully',
        code: expectedResult.stateCode,
        redirectUrl: expectedRedirectUrl,
      });
    });

    it('should handle missing provider parameter', async () => {
      const invalidDto = {
        callbackUrl: 'http://localhost:3000/auth/callback',
        // provider is missing
      } as any;

      await expect(
        controller.createAuthState(invalidDto, mockResponse, mockRequest),
      ).rejects.toThrow(AppErrorCodes.PROVIDER_NOT_FOUND);
    });

    it('should handle missing callback URL parameter', async () => {
      const invalidDto = {
        provider: 'google',
        // callbackUrl is missing
      } as any;

      await expect(
        controller.createAuthState(invalidDto, mockResponse, mockRequest),
      ).rejects.toThrow(AppErrorCodes.INTERNAL_SERVER_ERROR);
    });

    it('should handle authentication state creation failure', async () => {
      const errorResult = {
        success: false,
        error: 'server_error',
        errorDescription: 'Failed to create authentication state',
      };

      mockAuthCoreService.createAuthenticationState.mockResolvedValue(
        errorResult,
      );

      await expect(
        controller.createAuthState(
          validAuthStateDto,
          mockResponse,
          mockRequest,
        ),
      ).rejects.toThrow(AppErrorCodes.INTERNAL_SERVER_ERROR);
    });

    it('should handle unsupported provider', async () => {
      const unsupportedDto = {
        provider: 'facebook', // Unsupported provider
        callbackUrl: 'http://localhost:3000/auth/callback/facebook',
      };

      const errorResult = {
        success: false,
        error: 'unsupported_provider',
        errorDescription: 'Unsupported provider: facebook',
      };

      mockAuthCoreService.createAuthenticationState.mockResolvedValue(
        errorResult,
      );

      await expect(
        controller.createAuthState(unsupportedDto, mockResponse, mockRequest),
      ).rejects.toThrow(AppErrorCodes.PROVIDER_NOT_FOUND);
    });
  });

  describe('SNS OAuth Callback Processing - GET /auth/callback/google', () => {
    const validCode = 'google_auth_code_123';
    const validState = 'state_abc123';
    const mockSnsProfile = {
      providerId: 'google_user_123',
      provider: 'google',
      displayName: 'Test User',
      email: 'test@example.com',
      avatarUrl: 'https://example.com/avatar.jpg',
      rawProfile: {
        id: 'google_user_123',
        name: 'Test User',
        email: 'test@example.com',
        picture: 'https://example.com/avatar.jpg',
      },
    };

    beforeEach(() => {});

    it('should process Google OAuth callback successfully', async () => {
      // Mock auth state
      const mockAuthState = {
        id: 'auth_state_123',
        stateCode: validState,
        oneTimeToken: 'one_time_token_123',
        provider: 'google',
        callbackUrl: 'https://frontend.example.com/auth/callback/karasu-sns', // Different URL to trigger frontend callback
        userId: null, // Initially null, will be updated after profile processing
        codeVerifier: null,
        codeChallenge: null,
        codeChallengeMethod: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);

      // Mock successful Google OAuth flow (controller expects { snsProfile, accessToken })
      mockGoogleProvider.processOAuth.mockResolvedValue({
        snsProfile: mockSnsProfile,
        accessToken: 'access_token_123',
      });
      mockAuthCoreService.processSnsProfile.mockResolvedValue({
        userId: 'user_123',
        oneTimeToken: 'one_time_token_123',
        success: true,
      });

      // Ensure BASE_URL is defined for this invocation
      process.env.BASE_URL = 'http://localhost:3000';

      await controller.handleProviderCallback(
        'google', // provider
        validCode,
        validState,
        '',
        '', // queryCallbackUrl
        mockResponse,
        mockRequest,
      );

      expect(mockGoogleProvider.processOAuth).toHaveBeenCalledWith(
        validCode,
        'http://localhost:3000/auth/callback/google',
        undefined,
      );
      expect(mockAuthCoreService.processSnsProfile).toHaveBeenCalledWith(
        mockSnsProfile,
        validState,
      );
      expect(mockRedirectFn).toHaveBeenCalledWith(
        'https://frontend.example.com/auth/callback/karasu-sns?token=one_time_token_123&state=state_abc123',
      );
    });

    it('should handle OAuth provider error response', async () => {
      const error = 'access_denied';
      const frontendCallbackUrl = 'https://frontend.example.com/auth/callback';

      // Mock auth state (might not be available in error cases)
      mockAuthService.getAuthState.mockResolvedValue({
        callbackUrl: frontendCallbackUrl,
      } as any);

      await expect(
        controller.handleProviderCallback(
          'google', // provider
          '',
          validState,
          error,
          frontendCallbackUrl,
          mockResponse,
          mockRequest,
        ),
      ).rejects.toThrow(AppErrorCodes.INVALID_REQUEST);
    });

    it('should handle missing authorization code', async () => {
      const frontendCallbackUrl =
        'https://frontend.example.com/auth/callback/google';

      // Mock auth state for callback URL
      mockAuthService.getAuthState.mockResolvedValue({
        callbackUrl: frontendCallbackUrl,
      } as any);

      await expect(
        controller.handleProviderCallback(
          'google', // provider
          '', // Missing code
          validState,
          '',
          frontendCallbackUrl,
          mockResponse,
          mockRequest,
        ),
      ).rejects.toThrow(AppErrorCodes.INVALID_REQUEST);
    });

    it('should handle missing state parameter (CSRF attack protection)', async () => {
      const frontendCallbackUrl =
        'https://frontend.example.com/auth/callback/google';
      await expect(
        controller.handleProviderCallback(
          'google', // provider
          validCode,
          '', // Missing state
          '',
          frontendCallbackUrl,
          mockResponse,
          mockRequest,
        ),
      ).rejects.toThrow(AppErrorCodes.INVALID_REQUEST);
    });

    it('should handle invalid state code', async () => {
      const frontendCallbackUrl =
        'https://frontend.example.com/auth/callback/google';

      // Mock auth state not found
      mockAuthService.getAuthState.mockResolvedValue(null);
      await expect(
        controller.handleProviderCallback(
          'google', // provider
          validCode,
          'invalid_state_123',
          '',
          frontendCallbackUrl,
          mockResponse,
          mockRequest,
        ),
      ).rejects.toThrow(AppErrorCodes.INVALID_REQUEST);
    });

    it('should handle Google OAuth API failure', async () => {
      const frontendCallbackUrl =
        'https://frontend.example.com/auth/callback/google';

      // Mock auth state for frontend callback
      const mockAuthState = {
        id: 'auth_state_123',
        stateCode: validState,
        oneTimeToken: 'one_time_token_123',
        provider: 'google',
        callbackUrl: frontendCallbackUrl,
        userId: null,
        codeVerifier: null,
        codeChallenge: null,
        codeChallengeMethod: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockGoogleProvider.processOAuth.mockRejectedValue(
        AppErrorCodes.GOOGLE_TOKEN_EXCHANGE_FAILED,
      );

      // Ensure BASE_URL is defined for this invocation
      process.env.BASE_URL = 'http://localhost:3000';

      await expect(
        controller.handleProviderCallback(
          'google', // provider
          validCode,
          validState,
          '',
          frontendCallbackUrl,
          mockResponse,
          mockRequest,
        ),
      ).rejects.toThrow(AppErrorCodes.GOOGLE_TOKEN_EXCHANGE_FAILED);

      expect(mockGoogleProvider.processOAuth).toHaveBeenCalledWith(
        validCode,
        'http://localhost:3000/auth/callback/google',
        undefined,
      );
    });

    it('should handle profile processing failure', async () => {
      const frontendCallbackUrl =
        'https://frontend.example.com/auth/callback/google';

      // Mock auth state for frontend callback
      const mockAuthState = {
        id: 'auth_state_123',
        stateCode: validState,
        oneTimeToken: 'one_time_token_123',
        provider: 'google',
        callbackUrl: frontendCallbackUrl,
        userId: null,
        codeVerifier: null,
        codeChallenge: null,
        codeChallengeMethod: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockGoogleProvider.processOAuth.mockResolvedValue({
        snsProfile: mockSnsProfile,
        accessToken: 'access_token_123',
      });
      mockAuthCoreService.processSnsProfile.mockResolvedValue({
        success: false,
        error: 'server_error',
      });

      // Ensure BASE_URL is defined for this invocation
      process.env.BASE_URL = 'http://localhost:3000';

      await expect(
        controller.handleProviderCallback(
          'google', // provider
          validCode,
          validState,
          '',
          frontendCallbackUrl,
          mockResponse,
          mockRequest,
        ),
      ).rejects.toThrow(AppErrorCodes.INTERNAL_SERVER_ERROR);

      expect(mockGoogleProvider.processOAuth).toHaveBeenCalledWith(
        validCode,
        'http://localhost:3000/auth/callback/google',
        undefined,
      );
      expect(mockAuthCoreService.processSnsProfile).toHaveBeenCalledWith(
        mockSnsProfile,
        validState,
      );
    });
  });

  describe('Token Verification - POST /auth/verify', () => {
    const validVerifyDto = {
      stateCode: 'state_abc123',
      oneTimeToken: 'one_time_token_123',
    };

    beforeEach(() => {
      // Mock user data for verification tests
      const mockUser = {
        id: 'user_123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: null, // SNS users don't have passwords
        providers: ['google'],
        extraProfiles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        roles: [],
      };
      mockUserService.findUserById.mockResolvedValue(mockUser);
    });

    it('should verify token and return JWT successfully', async () => {
      const expectedResult = {
        success: true,
        profile: {
          sub: 'user_123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'user',
          provider: 'google',
          providers: ['google'],
          roles: [],
        },
        accessToken: 'access_token_abc123',
        jti: 'jwt_id_abc123',
        provider: 'external',
        refreshToken: 'refresh_token_abc123',
      };

      mockAuthCoreService.verifyAndCreateToken.mockResolvedValue(
        expectedResult as any,
      );

      await controller.verifyToken(validVerifyDto, mockResponse);

      expect(mockAuthCoreService.verifyAndCreateToken).toHaveBeenCalledWith(
        validVerifyDto,
      );
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockJsonFn).toHaveBeenCalledWith({
        message: 'Token verified successfully',
        jti: expectedResult.jti,
        access_token: expectedResult.accessToken,
        refresh_token: 'refresh_token_abc123',
        sessionId: 'session_1',
        provider: 'external',
      });
    });

    it("should return provider 'google' when core service sets provider to google", async () => {
      const expectedResult = {
        success: true,
        profile: {
          sub: 'user_123',
        },
        accessToken: 'access_token_abc123',
        jti: 'jwt_id_abc123',
        provider: 'google',
        refreshToken: 'refresh_token_abc123',
      };

      mockAuthCoreService.verifyAndCreateToken.mockResolvedValue(
        expectedResult as any,
      );

      await controller.verifyToken(validVerifyDto, mockResponse);

      expect(mockAuthCoreService.verifyAndCreateToken).toHaveBeenCalledWith(
        validVerifyDto,
      );
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockJsonFn).toHaveBeenCalledWith({
        message: 'Token verified successfully',
        jti: expectedResult.jti,
        access_token: expectedResult.accessToken,
        refresh_token: 'refresh_token_abc123',
        sessionId: 'session_1',
        provider: 'google',
      });
    });

    it('should handle missing state code', async () => {
      const invalidDto = {
        oneTimeToken: 'one_time_token_123',
        // stateCode is missing
      } as any;

      await expect(
        controller.verifyToken(invalidDto, mockResponse),
      ).rejects.toThrow(AppErrorCodes.INVALID_REQUEST);
    });

    it('should handle missing one-time token', async () => {
      const invalidDto = {
        stateCode: 'state_abc123',
        // oneTimeToken is missing
      } as any;

      await expect(
        controller.verifyToken(invalidDto, mockResponse),
      ).rejects.toThrow(AppErrorCodes.INVALID_REQUEST);
    });

    it('should handle invalid or expired token', async () => {
      // Simulate the core service throwing an AppErrorCode for invalid token
      mockAuthCoreService.verifyAndCreateToken.mockRejectedValue(
        AppErrorCodes.INVALID_TOKEN,
      );

      await expect(
        controller.verifyToken(validVerifyDto, mockResponse),
      ).rejects.toThrow(AppErrorCodes.INVALID_TOKEN);
    });

    it('should handle server error during token verification', async () => {
      // Simulate the core service throwing an AppErrorCode for server error
      mockAuthCoreService.verifyAndCreateToken.mockRejectedValue(
        AppErrorCodes.INVALID_TOKEN,
      );

      await expect(
        controller.verifyToken(validVerifyDto, mockResponse),
      ).rejects.toThrow(AppErrorCodes.INVALID_TOKEN);
    });

    it('should prevent token reuse after verification', async () => {
      // First verification should succeed
      const successResult = {
        success: true,
        profile: {
          sub: 'user_123',
          role: 'user',
          provider: 'google',
          providers: ['google'],
          roles: [],
        },
        accessToken: 'jwt_token_abc123',
        jti: 'jwt_id_abc123',
      };

      mockAuthCoreService.verifyAndCreateToken.mockResolvedValueOnce(
        successResult as any,
      );

      await controller.verifyToken(validVerifyDto, mockResponse);

      // Second verification with same token should fail
      const errorResult = {
        success: false,
        error: 'invalid_token',
        errorDescription: 'Token has already been used',
      };

      mockAuthCoreService.verifyAndCreateToken.mockRejectedValueOnce(
        AppErrorCodes.INVALID_TOKEN,
      );

      await expect(
        controller.verifyToken(validVerifyDto, mockResponse),
      ).rejects.toThrow(AppErrorCodes.INVALID_TOKEN);
    });

    it('should handle missing user ID in authentication state', async () => {
      // Simulate core service throwing an AppErrorCode for invalid state
      mockAuthCoreService.verifyAndCreateToken.mockRejectedValue(
        AppErrorCodes.INVALID_TOKEN,
      );

      await expect(
        controller.verifyToken(validVerifyDto, mockResponse),
      ).rejects.toThrow(AppErrorCodes.INVALID_TOKEN);
    });

    it('should handle user not found after verification', async () => {
      // Simulate core service throwing an AppErrorCode for user not found
      mockAuthCoreService.verifyAndCreateToken.mockRejectedValue(
        AppErrorCodes.INVALID_TOKEN,
      );

      await expect(
        controller.verifyToken(validVerifyDto, mockResponse),
      ).rejects.toThrow(AppErrorCodes.INVALID_TOKEN);
    });
  });

  describe('State Code Security Tests', () => {
    it('should validate state code expiration (15 minutes)', async () => {
      const expiredDate = new Date(Date.now() - 16 * 60 * 1000); // 16 minutes ago
      const expiredAuthState = {
        id: 'auth_state_123',
        stateCode: 'expired_state_123',
        oneTimeToken: 'one_time_token_123',
        provider: 'google',
        callbackUrl: 'http://localhost:3000/auth/callback/google',
        userId: 'user_123',
        codeVerifier: null,
        codeChallenge: null,
        codeChallengeMethod: null,
        expiresAt: expiredDate,
        used: false,
        createdAt: new Date(),
      };

      mockAuthStateService.findAuthState.mockResolvedValue(expiredAuthState);

      const verifyDto = {
        stateCode: 'expired_state_123',
        oneTimeToken: 'one_time_token_123',
      };

      mockAuthCoreService.verifyAndCreateToken.mockRejectedValue(
        AppErrorCodes.INVALID_TOKEN,
      );

      await expect(
        controller.verifyToken(verifyDto, mockResponse),
      ).rejects.toThrow(AppErrorCodes.INVALID_TOKEN);
    });

    it('should prevent state code reuse', async () => {
      const usedAuthState = {
        id: 'auth_state_123',
        stateCode: 'used_state_123',
        oneTimeToken: 'one_time_token_123',
        provider: 'google',
        callbackUrl: 'http://localhost:3000/auth/callback/google',
        userId: 'user_123',
        codeVerifier: null,
        codeChallenge: null,
        codeChallengeMethod: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: true, // Already used
        createdAt: new Date(),
      };

      mockAuthStateService.findAuthState.mockResolvedValue(usedAuthState);

      const verifyDto = {
        stateCode: 'used_state_123',
        oneTimeToken: 'one_time_token_123',
      };

      // Simulate core service throwing an AppErrorCode for reused token
      mockAuthCoreService.verifyAndCreateToken.mockRejectedValue(
        AppErrorCodes.INVALID_TOKEN,
      );

      await expect(
        controller.verifyToken(verifyDto, mockResponse),
      ).rejects.toThrow(AppErrorCodes.INVALID_TOKEN);
    });

    it('should handle non-existent state code', async () => {
      mockAuthStateService.findAuthState.mockResolvedValue(null);

      const verifyDto = {
        stateCode: 'non_existent_state_123',
        oneTimeToken: 'one_time_token_123',
      };

      mockAuthCoreService.verifyAndCreateToken.mockRejectedValue(
        AppErrorCodes.INVALID_TOKEN,
      );

      await expect(
        controller.verifyToken(verifyDto, mockResponse),
      ).rejects.toThrow(AppErrorCodes.INVALID_TOKEN);
    });
  });

  describe('SNS Profile Processing Tests', () => {
    const mockGoogleProfile = {
      providerId: 'google_user_123',
      provider: 'google',
      displayName: 'Test User',
      email: 'test@example.com',
      avatarUrl: 'https://example.com/avatar.jpg',
      rawProfile: {
        id: 'google_user_123',
        name: 'Test User',
        email: 'test@example.com',
        picture: 'https://example.com/avatar.jpg',
      },
    };

    it('should create new user for first-time Google login', async () => {
      // Mock auth state
      const mockAuthState = {
        id: 'auth_state_123',
        stateCode: 'state_abc123',
        oneTimeToken: 'one_time_token_123',
        provider: 'google',
        callbackUrl: 'http://localhost:3000/auth/callback/google',
        userId: null,
        codeVerifier: null,
        codeChallenge: null,
        codeChallengeMethod: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockGoogleProvider.processOAuth.mockResolvedValue({
        snsProfile: mockGoogleProfile,
        accessToken: 'access_token_123',
      });
      mockAuthCoreService.processSnsProfile.mockResolvedValue({
        success: true,
        userId: 'new_user_123',
        oneTimeToken: 'one_time_token_123',
      });

      await controller.handleProviderCallback(
        'google', // provider
        'auth_code_123',
        'state_abc123',
        '',
        '',
        mockResponse,
        mockRequest,
      );

      expect(mockAuthCoreService.processSnsProfile).toHaveBeenCalledWith(
        mockGoogleProfile,
        'state_abc123',
      );
    });

    it('should link Google account to existing user by email', async () => {
      // Mock auth state
      const mockAuthState = {
        id: 'auth_state_123',
        stateCode: 'state_abc123',
        oneTimeToken: 'one_time_token_123',
        provider: 'google',
        callbackUrl: 'http://localhost:3000/auth/callback/google',
        userId: null,
        codeVerifier: null,
        codeChallenge: null,
        codeChallengeMethod: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockGoogleProvider.processOAuth.mockResolvedValue({
        snsProfile: mockGoogleProfile,
        accessToken: 'access_token_123',
      });
      mockAuthCoreService.processSnsProfile.mockResolvedValue({
        success: true,
        userId: 'existing_user_123',
        oneTimeToken: 'one_time_token_123',
      });

      await controller.handleProviderCallback(
        'google', // provider
        'auth_code_123',
        'state_abc123',
        '',
        '',
        mockResponse,
        mockRequest,
      );

      expect(mockAuthCoreService.processSnsProfile).toHaveBeenCalledWith(
        mockGoogleProfile,
        'state_abc123',
      );
    });

    it('should update existing Google profile information', async () => {
      const updatedProfile = {
        ...mockGoogleProfile,
        displayName: 'Updated Test User',
        avatarUrl: 'https://example.com/new_avatar.jpg',
      };

      // Mock auth state
      const mockAuthState = {
        id: 'auth_state_123',
        stateCode: 'state_abc123',
        oneTimeToken: 'one_time_token_123',
        provider: 'google',
        callbackUrl: 'http://localhost:3000/auth/callback/google',
        userId: null,
        codeVerifier: null,
        codeChallenge: null,
        codeChallengeMethod: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockGoogleProvider.processOAuth.mockResolvedValue({
        snsProfile: updatedProfile,
        accessToken: 'access_token_123',
      });
      mockAuthCoreService.processSnsProfile.mockResolvedValue({
        success: true,
        userId: 'existing_user_123',
        oneTimeToken: 'one_time_token_123',
      });

      await controller.handleProviderCallback(
        'google', // provider
        'auth_code_123',
        'state_abc123',
        '',
        '', // queryCallbackUrl
        mockResponse,
        mockRequest,
      );

      expect(mockAuthCoreService.processSnsProfile).toHaveBeenCalledWith(
        updatedProfile,
        'state_abc123',
      );
    });

    it('should return linked user when email changed but ExtraProfile exists', async () => {
      // Scenario: user changed their email in system, but ExtraProfile still links providerId->user
      const changedEmailProfile = {
        providerId: 'google_user_123',
        provider: 'google',
        displayName: 'Test User',
        email: 'new-email@example.com', // different from original
        avatarUrl: 'https://example.com/avatar.jpg',
        rawProfile: {
          id: 'google_user_123',
          name: 'Test User',
          email: 'new-email@example.com',
          picture: 'https://example.com/avatar.jpg',
        },
      };

      // Auth state
      const mockAuthState = {
        id: 'auth_state_123',
        stateCode: 'state_abc123',
        oneTimeToken: 'one_time_token_123',
        provider: 'google',
        callbackUrl: 'http://localhost:3000/auth/callback/google',
        userId: null,
        codeVerifier: null,
        codeChallenge: null,
        codeChallengeMethod: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockGoogleProvider.processOAuth.mockResolvedValue({
        snsProfile: changedEmailProfile,
        accessToken: 'access_token_123',
      });

      // Simulate processSnsProfile returning same linked user (no new user created)
      mockAuthCoreService.processSnsProfile.mockResolvedValue({
        success: true,
        userId: 'existing_user_123',
        oneTimeToken: 'one_time_token_123',
      });

      await controller.handleProviderCallback(
        'google',
        'auth_code_123',
        'state_abc123',
        '',
        '',
        mockResponse,
        mockRequest,
      );

      expect(mockAuthCoreService.processSnsProfile).toHaveBeenCalledWith(
        changedEmailProfile,
        'state_abc123',
      );
      expect(mockRedirectFn).toHaveBeenCalledWith(
        expect.stringContaining('token=one_time_token_123'),
      );
    });

    it('should create new user when neither email nor ExtraProfile match', async () => {
      const freshProfile = {
        providerId: 'google_user_new',
        provider: 'google',
        displayName: 'Fresh User',
        email: 'fresh@example.com',
        avatarUrl: 'https://example.com/avatar2.jpg',
        rawProfile: {},
      };

      const mockAuthState = {
        id: 'auth_state_999',
        stateCode: 'state_new_999',
        oneTimeToken: 'one_time_token_999',
        provider: 'google',
        callbackUrl: 'http://localhost:3000/auth/callback/google',
        userId: null,
        codeVerifier: null,
        codeChallenge: null,
        codeChallengeMethod: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockGoogleProvider.processOAuth.mockResolvedValue({
        snsProfile: freshProfile,
        accessToken: 'access_token_999',
      });

      mockAuthCoreService.processSnsProfile.mockResolvedValue({
        success: true,
        userId: 'new_user_999',
        oneTimeToken: 'one_time_token_999',
      });

      await controller.handleProviderCallback(
        'google',
        'auth_code_999',
        'state_new_999',
        '',
        '',
        mockResponse,
        mockRequest,
      );

      expect(mockAuthCoreService.processSnsProfile).toHaveBeenCalledWith(
        freshProfile,
        'state_new_999',
      );
      expect(mockRedirectFn).toHaveBeenCalledWith(
        expect.stringContaining('token=one_time_token_999'),
      );
    });

    it('should include linkVerifyCode for existing user with password and then skip verification after linking', async () => {
      // Arrange: auth state and SNS profile
      const mockAuthState = {
        id: 'auth_state_link_123',
        stateCode: 'state_link_123',
        oneTimeToken: 'one_time_token_link_123',
        provider: 'google',
        callbackUrl: 'http://localhost:3000/auth/callback/google',
        userId: null,
        codeVerifier: null,
        codeChallenge: null,
        codeChallengeMethod: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      const snsProfile = {
        providerId: 'google_user_link_123',
        provider: 'google',
        displayName: 'Link User',
        email: 'linkuser@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
        rawProfile: {},
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockGoogleProvider.processOAuth.mockResolvedValue({
        snsProfile,
        accessToken: 'access_token_link_123',
      });

      // processSnsProfile returns existing user id
      mockAuthCoreService.processSnsProfile.mockResolvedValue({
        success: true,
        userId: 'existing_user_link_123',
        oneTimeToken: mockAuthState.oneTimeToken,
      });

      // First call: controller should ask AuthService to create verify code
      mockAuthService.createExternalProviderLinkVerificationIfNeeded.mockResolvedValue(
        'verifycode_link_123',
      );

      process.env.BASE_URL = 'http://localhost:3000';

      await controller.handleProviderCallback(
        'google',
        'auth_code_link_123',
        mockAuthState.stateCode,
        '',
        '',
        mockResponse,
        mockRequest,
      );

      // Redirect should contain linkVerifyCode and linkProvider
      expect(mockAuthCoreService.processSnsProfile).toHaveBeenCalledWith(
        snsProfile,
        mockAuthState.stateCode,
      );
      expect(
        mockAuthService.createExternalProviderLinkVerificationIfNeeded,
      ).toHaveBeenCalledWith('existing_user_link_123', 'google', snsProfile);

      expect(mockRedirectFn).toHaveBeenCalledWith(
        expect.stringContaining('linkVerifyCode=verifycode_link_123'),
      );
      expect(mockRedirectFn).toHaveBeenCalledWith(
        expect.stringContaining('linkProvider=google'),
      );

      // Simulate front-end posting verification code to /auth/link/verify
      mockAuthService.finalizeExternalProviderLinkAfterVerification.mockResolvedValue(
        { success: true },
      );

      const jwtUser = { id: 'existing_user_link_123' } as any;
      const body = { provider: 'google', verifyCode: 'verifycode_link_123' };

      await controller.verifyLinkProvider(body, jwtUser, mockResponse);

      expect(
        mockAuthService.finalizeExternalProviderLinkAfterVerification,
      ).toHaveBeenCalledWith(
        'existing_user_link_123',
        'google',
        'verifycode_link_123',
      );

      // After successful linking, subsequent SNS login shouldn't request a verify code
      mockAuthService.createExternalProviderLinkVerificationIfNeeded.mockResolvedValue(
        null,
      );

      // Call callback again for same user/provider
      await controller.handleProviderCallback(
        'google',
        'auth_code_link_456',
        mockAuthState.stateCode,
        '',
        '',
        mockResponse,
        mockRequest,
      );

      // Redirect should NOT contain linkVerifyCode now
      const lastRedirectCallArg =
        mockRedirectFn.mock.calls[mockRedirectFn.mock.calls.length - 1][0];
      expect(lastRedirectCallArg).not.toContain('linkVerifyCode=');
    });
  });

  describe('Cleanup and Maintenance Tests', () => {
    it('should cleanup expired authentication states', async () => {
      mockAuthStateService.cleanupExpiredAuthStates.mockResolvedValue({
        count: 5,
      });

      // This would typically be called by a scheduled task
      await mockAuthStateService.cleanupExpiredAuthStates();

      expect(mockAuthStateService.cleanupExpiredAuthStates).toHaveBeenCalled();
    });
  });

  describe('Environment Configuration Tests', () => {
    it('should handle missing Google OAuth credentials', async () => {
      // Mock environment variables being undefined
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        BASE_URL: 'http://localhost:3000',
        GOOGLE_CLIENT_ID: undefined,
        GOOGLE_CLIENT_SECRET: undefined,
      };

      const authStateDto = {
        provider: 'google',
        callbackUrl: 'http://localhost:3000/auth/callback/google',
      };

      const errorResult = {
        success: false,
        error: 'configuration_error',
        errorDescription: 'Google OAuth credentials not configured',
      };

      mockAuthCoreService.createAuthenticationState.mockResolvedValue(
        errorResult,
      );

      await expect(
        controller.createAuthState(authStateDto, mockResponse, mockRequest),
      ).rejects.toThrow(AppErrorCodes.INTERNAL_SERVER_ERROR);

      // Restore environment
      process.env = originalEnv;
    });

    it('should use environment variables for callback URLs', async () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        BASE_URL: 'https://api.example.com',
        FRONTEND_CALLBACK_URL: 'https://app.example.com/auth/callback',
      };

      const authStateDto = {
        provider: 'google',
        callbackUrl: 'https://app.example.com/auth/callback/google',
      };

      const expectedResult = {
        success: true,
        stateCode: 'state_abc123',
        redirectUrl: 'https://accounts.google.com/o/oauth2/v2/auth?...',
      };

      const expectedRedirectUrl =
        'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&state=state_abc123';

      mockAuthCoreService.createAuthenticationState.mockResolvedValue(
        expectedResult,
      );
      mockGoogleProvider.getAuthorizationUrl.mockReturnValue(
        expectedRedirectUrl,
      );
      mockAuthStateService.findAuthState.mockResolvedValue({
        id: 'auth_state_123',
        stateCode: 'state_abc123',
        oneTimeToken: 'one_time_token_123',
        provider: 'google',
        callbackUrl: authStateDto.callbackUrl,
        userId: null,
        codeVerifier: null,
        codeChallenge: null,
        codeChallengeMethod: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      });

      await controller.createAuthState(authStateDto, mockResponse, mockRequest);

      expect(
        mockAuthCoreService.createAuthenticationState,
      ).toHaveBeenCalledWith(authStateDto, mockGoogleProvider);

      // Restore environment
      process.env = originalEnv;
    });
  });

  describe('Discord Login Endpoint Tests', () => {
    const validCallbackUrl = 'http://localhost:3000/auth/callback/discord';

    describe('Integration Flow Tests', () => {
      it('should complete full Google OAuth flow successfully', async () => {
        // 1. Create authentication state
        const stateResult = {
          success: true,
          stateCode: 'state_abc123',
          redirectUrl: 'https://accounts.google.com/o/oauth2/v2/auth?...',
        };

        const expectedRedirectUrl =
          'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&state=state_abc123';

        mockAuthCoreService.createAuthenticationState.mockResolvedValue(
          stateResult,
        );
        mockGoogleProvider.getAuthorizationUrl.mockReturnValue(
          expectedRedirectUrl,
        );

        const authStateDto = {
          provider: 'google',
          callbackUrl: 'http://localhost:3000/auth/callback/google',
        };

        mockAuthStateService.findAuthState.mockResolvedValue({
          id: 'auth_state_123',
          stateCode: 'state_abc123',
          oneTimeToken: 'one_time_token_123',
          provider: 'google',
          callbackUrl: authStateDto.callbackUrl,
          userId: null,
          codeVerifier: null,
          codeChallenge: null,
          codeChallengeMethod: null,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          used: false,
          createdAt: new Date(),
        });

        await controller.createAuthState(
          authStateDto,
          mockResponse,
          mockRequest,
        );

        // 2. Process callback
        const snsProfile = {
          providerId: 'google_user_123',
          provider: 'google',
          displayName: 'Test User',
          email: 'test@example.com',
          avatarUrl: 'https://example.com/avatar.jpg',
          rawProfile: {},
        };

        // Mock auth state
        const mockAuthState = {
          id: 'auth_state_123',
          stateCode: 'state_abc123',
          oneTimeToken: 'one_time_token_123',
          provider: 'google',
          callbackUrl: 'http://localhost:3000/auth/callback/google',
          userId: null,
          codeVerifier: null,
          codeChallenge: null,
          codeChallengeMethod: null,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          used: false,
          createdAt: new Date(),
        };

        mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
        mockGoogleProvider.processOAuth.mockResolvedValue({
          snsProfile: snsProfile,
          accessToken: 'access_token_123',
        });
        mockAuthCoreService.processSnsProfile.mockResolvedValue({
          success: true,
          userId: 'user_123',
          oneTimeToken: 'one_time_token_123',
        });

        await controller.handleProviderCallback(
          'google', // provider
          'auth_code_123',
          'state_abc123',
          '',
          '', // queryCallbackUrl
          mockResponse,
          mockRequest,
        );

        // 3. Verify token
        const verifyResult = {
          success: true,
          profile: {
            sub: 'user_123',
            name: 'Test User',
            email: 'test@example.com',
            role: 'user',
            provider: 'google',
            providers: ['google'],
            roles: [],
          },
          accessToken: 'jwt_token_abc123',
          jti: 'jwt_id_abc123',
          refreshToken: 'refresh_token_abc123',
        };

        mockAuthCoreService.verifyAndCreateToken.mockResolvedValue(
          verifyResult as any,
        );

        const verifyDto = {
          stateCode: 'state_abc123',
          oneTimeToken: 'one_time_token_123',
        };

        await controller.verifyToken(verifyDto, mockResponse);

        // Verify all steps were called correctly
        expect(
          mockAuthCoreService.createAuthenticationState,
        ).toHaveBeenCalledWith(authStateDto, mockGoogleProvider);
        expect(mockGoogleProvider.processOAuth).toHaveBeenCalled();
        expect(mockAuthCoreService.processSnsProfile).toHaveBeenCalledWith(
          snsProfile,
          'state_abc123',
        );
        expect(mockAuthCoreService.verifyAndCreateToken).toHaveBeenCalledWith(
          verifyDto,
        );
      });
    });
  });
});
