import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import * as snsAuth from '../lib/auth/sns-auth';
import { OAuthProviderFactory } from '../lib/auth/oauth-provider.factory';
import { AppErrorCodes } from '../types/error-codes';
import { ExternalProviderAccessTokenService } from '../data-base/query/external-provider-access-token/external-provider-access-token.service';
import { mock } from 'jest-mock-extended';
import { JwtTokenService } from './jwt-token/jwt-token.service';
import { AuthStateService } from '../data-base/query/auth-state/auth-state.service';
import { DataBaseService } from '../data-base/data-base.service';
import { UtilityService } from '../data-base/utility/utility.service';
import { RoleService } from '../data-base/query/role/role.service';
import { AuthCoreService } from './sns/auth-core/auth-core.service';
import { UserService } from '../data-base/query/user/user.service';
import { WorkflowService } from './sns/workflow/workflow.service';

// Mock implementations
jest.mock('../lib/auth/sns-auth');

describe('AuthController - SNS OAuth Authentication', () => {
  let controller: AuthController;
  let service: AuthService;
  let _savedBaseUrl: string | undefined;

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
  const mockGoogleProvider = {
    getProvider: jest.fn().mockReturnValue('google'),
    getAuthorizationUrl: jest.fn(),
    processOAuth: jest.fn(),
    isAvailable: jest.fn().mockReturnValue(true),
  };

  const mockDiscordProvider = {
    getProvider: jest.fn().mockReturnValue('discord'),
    getAuthorizationUrl: jest.fn(),
    processOAuth: jest.fn(),
    isAvailable: jest.fn().mockReturnValue(true),
  };

  const mockOAuthProviderFactory = {
    getProvider: jest.fn((provider: string) => {
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
  };

  let mockJwtTokenService: JwtTokenService;
  let mockAuthStateService: AuthStateService;
  let mockAuthCoreService: AuthCoreService;
  let mockSnsAuthCallback: snsAuth.SnsAuthCallback;
  let mockUserService: UserService;
  let mockSnsWorkflowService: WorkflowService;

  beforeEach(async () => {
    // Ensure BASE_URL is defined before creating the testing module so controller
    // and providers that read it during initialization get a defined value.
    _savedBaseUrl = process.env.BASE_URL;
    process.env.BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_jwt_secret';

    mockJwtTokenService = mock<JwtTokenService>();
    mockAuthStateService = mock<AuthStateService>();
    const mockDatabaseService = mock<DataBaseService>();
    const mockUtilityService = mock<UtilityService>();
    const mockRoleService = mock<RoleService>();
    mockAuthCoreService = mock<AuthCoreService>();
    mockSnsAuthCallback = mock<snsAuth.SnsAuthCallback>();
    mockUserService = mock<UserService>();
    mockSnsWorkflowService = mock<WorkflowService>();

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

      mockAuthCoreService.createAuthenticationState = jest
        .fn()
        .mockResolvedValue(expectedResult);
      mockGoogleProvider.getAuthorizationUrl.mockReturnValue(
        expectedRedirectUrl,
      );
      mockAuthStateService.findAuthState = jest.fn().mockResolvedValue({
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
        state_code: expectedResult.stateCode,
        redirect_url: expectedRedirectUrl,
      });
    });

    it('should handle missing provider parameter', async () => {
      const invalidDto = {
        callbackUrl: 'http://localhost:3000/auth/callback',
        // provider is missing
      } as any;

      await expect(
        controller.createAuthState(invalidDto, mockResponse, mockRequest),
      ).rejects.toThrow(AppErrorCodes.INVALID_REQUEST);
    });

    it('should handle missing callback URL parameter', async () => {
      const invalidDto = {
        provider: 'google',
        // callbackUrl is missing
      } as any;

      await expect(
        controller.createAuthState(invalidDto, mockResponse, mockRequest),
      ).rejects.toThrow(AppErrorCodes.INVALID_REQUEST);
    });

    it('should handle authentication state creation failure', async () => {
      const errorResult = {
        success: false,
        error: 'server_error',
        errorDescription: 'Failed to create authentication state',
      };

      mockAuthCoreService.createAuthenticationState = jest
        .fn()
        .mockResolvedValue(errorResult);

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

      mockAuthCoreService.createAuthenticationState = jest
        .fn()
        .mockResolvedValue(errorResult);

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

    let buildCallbackRedirectMock: jest.Mock;
    let buildErrorRedirectMock: jest.Mock;

    beforeEach(() => {
      // Setup static method mocks with dynamic implementation
      buildCallbackRedirectMock = jest
        .fn()
        .mockImplementation((callbackUrl, stateCode, oneTimeToken, error) => {
          if (error) {
            return `${callbackUrl}?error=${error}`;
          } else {
            return `${callbackUrl}?state=${stateCode}&token=${oneTimeToken}`;
          }
        });
      buildErrorRedirectMock = jest
        .fn()
        .mockImplementation((callbackUrl, error) => {
          return `${callbackUrl}?error=${error}`;
        });

      mockSnsAuthCallback.buildCallbackRedirect = buildCallbackRedirectMock;
      mockAuthCoreService.buildErrorRedirect = buildErrorRedirectMock;

      // Setup provider processOAuth mock
      mockGoogleProvider.processOAuth = jest.fn();
      mockDiscordProvider.processOAuth = jest.fn();
    });

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
      mockAuthCoreService.processSnsProfile = jest.fn().mockResolvedValue({
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

      await controller.handleProviderCallback(
        'google', // provider
        '',
        validState,
        error,
        frontendCallbackUrl,
        mockResponse,
        mockRequest,
      );

      expect(buildErrorRedirectMock).toHaveBeenCalledWith(
        frontendCallbackUrl,
        error,
      );
      expect(mockRedirectFn).toHaveBeenCalledWith(
        expect.stringContaining('error=access_denied'),
      );
    });

    it('should handle missing authorization code', async () => {
      const frontendCallbackUrl =
        'https://frontend.example.com/auth/callback/google';

      // Mock auth state for callback URL
      mockAuthService.getAuthState.mockResolvedValue({
        callbackUrl: frontendCallbackUrl,
      } as any);

      await controller.handleProviderCallback(
        'google', // provider
        '', // Missing code
        validState,
        '',
        frontendCallbackUrl,
        mockResponse,
        mockRequest,
      );

      expect(buildErrorRedirectMock).toHaveBeenCalledWith(
        frontendCallbackUrl,
        'invalid_request',
      );
    });

    it('should handle missing state parameter (CSRF attack protection)', async () => {
      const frontendCallbackUrl =
        'https://frontend.example.com/auth/callback/google';

      await controller.handleProviderCallback(
        'google', // provider
        validCode,
        '', // Missing state
        '',
        frontendCallbackUrl,
        mockResponse,
        mockRequest,
      );

      expect(buildErrorRedirectMock).toHaveBeenCalledWith(
        frontendCallbackUrl,
        'invalid_request',
      );
    });

    it('should handle invalid state code', async () => {
      const frontendCallbackUrl =
        'https://frontend.example.com/auth/callback/google';

      // Mock auth state not found
      mockAuthService.getAuthState.mockResolvedValue(null);

      await controller.handleProviderCallback(
        'google', // provider
        validCode,
        'invalid_state_123',
        '',
        frontendCallbackUrl,
        mockResponse,
        mockRequest,
      );

      expect(buildErrorRedirectMock).toHaveBeenCalledWith(
        frontendCallbackUrl,
        'invalid_state',
      );
      expect(mockRedirectFn).toHaveBeenCalledWith(
        expect.stringContaining('error=invalid_state'),
      );
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
        new Error('Google token exchange failed'),
      );

      // Ensure BASE_URL is defined for this invocation
      process.env.BASE_URL = 'http://localhost:3000';

      await controller.handleProviderCallback(
        'google', // provider
        validCode,
        validState,
        '',
        frontendCallbackUrl,
        mockResponse,
        mockRequest,
      );

      expect(mockGoogleProvider.processOAuth).toHaveBeenCalledWith(
        validCode,
        'http://localhost:3000/auth/callback/google',
        undefined,
      );
      expect(console.error).toHaveBeenCalledWith(
        'OAuth callback error:',
        expect.any(Error),
      );
      expect(buildErrorRedirectMock).toHaveBeenCalledWith(
        frontendCallbackUrl,
        'server_error',
      );
      expect(mockRedirectFn).toHaveBeenCalledWith(
        expect.stringContaining('error=server_error'),
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
      mockAuthCoreService.processSnsProfile = jest.fn().mockResolvedValue({
        success: false,
        error: 'server_error',
      });

      // Ensure BASE_URL is defined for this invocation
      process.env.BASE_URL = 'http://localhost:3000';

      await controller.handleProviderCallback(
        'google', // provider
        validCode,
        validState,
        '',
        frontendCallbackUrl,
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
      expect(buildErrorRedirectMock).toHaveBeenCalledWith(
        frontendCallbackUrl,
        'server_error',
      );
      expect(mockRedirectFn).toHaveBeenCalledWith(
        expect.stringContaining('error=server_error'),
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
      mockUserService.findUserById = jest.fn().mockResolvedValue(mockUser);
      mockJwtTokenService.generateRefreshToken = jest.fn().mockResolvedValue({
        success: true,
        token: 'refresh_token_abc123',
      });
      mockAuthService.createSession.mockResolvedValue({
        sessionId: 'session_id_abc123',
      } as any);
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
        token: 'access_token_abc123',
        jwtId: 'jwt_id_abc123',
      };

      mockAuthCoreService.verifyAndCreateToken = jest
        .fn()
        .mockResolvedValue(expectedResult);

      await controller.verifyToken(validVerifyDto, mockResponse);

      expect(mockAuthCoreService.verifyAndCreateToken).toHaveBeenCalledWith(
        validVerifyDto,
      );
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockJsonFn).toHaveBeenCalledWith({
        message: 'Token verified successfully',
        jwtId: expectedResult.jwtId,
        profile: expectedResult.profile,
        access_token: expectedResult.token,
        refresh_token: 'refresh_token_abc123',
        session_id: 'session_id_abc123',
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
      const errorResult = {
        success: false,
        error: 'invalid_token',
        errorDescription: 'Invalid or expired authentication token',
      };

      mockAuthCoreService.verifyAndCreateToken = jest
        .fn()
        .mockResolvedValue(errorResult);

      await expect(
        controller.verifyToken(validVerifyDto, mockResponse),
      ).rejects.toThrow(AppErrorCodes.INVALID_TOKEN);
    });

    it('should handle server error during token verification', async () => {
      const errorResult = {
        success: false,
        error: 'server_error',
        errorDescription: 'Failed to verify authentication token',
      };

      mockAuthCoreService.verifyAndCreateToken = jest
        .fn()
        .mockResolvedValue(errorResult);

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
        token: 'jwt_token_abc123',
        jwtId: 'jwt_id_abc123',
      };

      mockAuthCoreService.verifyAndCreateToken = jest
        .fn()
        .mockResolvedValueOnce(successResult);
      mockAuthService.createSession.mockResolvedValueOnce({
        sessionId: 'session_id_abc123',
      } as any);

      await controller.verifyToken(validVerifyDto, mockResponse);

      // Second verification with same token should fail
      const errorResult = {
        success: false,
        error: 'invalid_token',
        errorDescription: 'Token has already been used',
      };

      mockAuthCoreService.verifyAndCreateToken = jest
        .fn()
        .mockResolvedValueOnce(errorResult);

      await expect(
        controller.verifyToken(validVerifyDto, mockResponse),
      ).rejects.toThrow(AppErrorCodes.INVALID_TOKEN);
    });

    it('should handle missing user ID in authentication state', async () => {
      const errorResult = {
        success: false,
        error: 'invalid_state',
        errorDescription:
          'Authentication state does not contain user information',
      };

      mockAuthCoreService.verifyAndCreateToken = jest
        .fn()
        .mockResolvedValue(errorResult);

      await expect(
        controller.verifyToken(validVerifyDto, mockResponse),
      ).rejects.toThrow(AppErrorCodes.INVALID_TOKEN);
    });

    it('should handle user not found after verification', async () => {
      const errorResult = {
        success: false,
        error: 'user_not_found',
        errorDescription: 'User associated with authentication state not found',
      };

      mockAuthCoreService.verifyAndCreateToken = jest
        .fn()
        .mockResolvedValue(errorResult);

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

      mockAuthStateService.findAuthState = jest
        .fn()
        .mockResolvedValue(expiredAuthState);

      const verifyDto = {
        stateCode: 'expired_state_123',
        oneTimeToken: 'one_time_token_123',
      };

      const errorResult = {
        success: false,
        error: 'invalid_token',
        errorDescription: 'Invalid or expired authentication token',
      };

      mockAuthCoreService.verifyAndCreateToken = jest
        .fn()
        .mockResolvedValue(errorResult);

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

      mockAuthStateService.findAuthState = jest
        .fn()
        .mockResolvedValue(usedAuthState);

      const verifyDto = {
        stateCode: 'used_state_123',
        oneTimeToken: 'one_time_token_123',
      };

      const errorResult = {
        success: false,
        error: 'invalid_token',
        errorDescription: 'Token has already been used',
      };

      mockAuthCoreService.verifyAndCreateToken = jest
        .fn()
        .mockResolvedValue(errorResult);

      await expect(
        controller.verifyToken(verifyDto, mockResponse),
      ).rejects.toThrow(AppErrorCodes.INVALID_TOKEN);
    });

    it('should handle non-existent state code', async () => {
      mockAuthStateService.findAuthState = jest.fn().mockResolvedValue(null);

      const verifyDto = {
        stateCode: 'non_existent_state_123',
        oneTimeToken: 'one_time_token_123',
      };

      const errorResult = {
        success: false,
        error: 'invalid_token',
        errorDescription: 'Invalid authentication state',
      };

      mockAuthCoreService.verifyAndCreateToken = jest
        .fn()
        .mockResolvedValue(errorResult);

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
      mockAuthCoreService.processSnsProfile = jest.fn().mockResolvedValue({
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
      mockAuthCoreService.processSnsProfile = jest.fn().mockResolvedValue({
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
      mockAuthCoreService.processSnsProfile = jest.fn().mockResolvedValue({
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
      mockAuthCoreService.processSnsProfile = jest.fn().mockResolvedValue({
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

      mockAuthCoreService.processSnsProfile = jest.fn().mockResolvedValue({
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
  });

  describe('Cleanup and Maintenance Tests', () => {
    it('should cleanup expired authentication states', async () => {
      mockAuthStateService.cleanupExpiredAuthStates = jest
        .fn()
        .mockResolvedValue({
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

      mockAuthCoreService.createAuthenticationState = jest
        .fn()
        .mockResolvedValue(errorResult);

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

      mockAuthCoreService.createAuthenticationState = jest
        .fn()
        .mockResolvedValue(expectedResult);
      mockGoogleProvider.getAuthorizationUrl.mockReturnValue(
        expectedRedirectUrl,
      );
      mockAuthStateService.findAuthState = jest.fn().mockResolvedValue({
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

    it('should initiate Discord authentication successfully', async () => {
      const mockResult = {
        success: true,
        stateCode: 'state_discord_123',
        redirectUrl:
          'https://discord.com/oauth2/authorize?response_type=code&client_id=discord_client_id&redirect_uri=http%3A//localhost%3A3000/auth/callback&scope=identify%20email&state=state_discord_123',
      };

      mockAuthCoreService.createAuthenticationState = jest
        .fn()
        .mockResolvedValue(mockResult);
      mockDiscordProvider.getAuthorizationUrl.mockReturnValue(
        mockResult.redirectUrl,
      );
      mockAuthStateService.findAuthState = jest.fn().mockResolvedValue({
        id: 'auth_state_123',
        stateCode: 'state_discord_123',
        oneTimeToken: 'one_time_token_123',
        provider: 'discord',
        callbackUrl: validCallbackUrl,
        userId: null,
        codeVerifier: null,
        codeChallenge: null,
        codeChallengeMethod: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      });

      // Mock the GET request to /auth/login/discord
      await controller.loginWithProvider(
        'discord',
        validCallbackUrl,
        mockResponse,
        mockRequest,
      );

      expect(mockDiscordProvider.getAuthorizationUrl).toHaveBeenCalled();
      expect(mockRedirectFn).toHaveBeenCalled();
    });

    it('should handle Discord authentication initiation failure', async () => {
      const mockResult = {
        success: false,
        error: 'configuration_error',
        errorDescription: 'Discord client credentials not configured',
      };

      mockAuthCoreService.createAuthenticationState = jest
        .fn()
        .mockResolvedValue(mockResult);

      // Mock provider to throw unavailable error
      mockDiscordProvider.isAvailable.mockReturnValue(false);

      await expect(
        controller.loginWithProvider(
          'discord',
          validCallbackUrl,
          mockResponse,
          mockRequest,
        ),
      ).rejects.toThrow(AppErrorCodes.PROVIDER_UNAVAILABLE);
    });

    it('should use default callback URL when none provided', async () => {
      const mockResult = {
        success: true,
        stateCode: 'state_discord_123',
        redirectUrl: 'https://discord.com/oauth2/authorize?...',
      };

      mockAuthCoreService.createAuthenticationState = jest
        .fn()
        .mockResolvedValue(mockResult);
      mockDiscordProvider.getAuthorizationUrl.mockReturnValue(
        mockResult.redirectUrl,
      );
      mockAuthStateService.findAuthState = jest.fn().mockResolvedValue({
        id: 'auth_state_456',
        stateCode: 'state_discord_456',
        oneTimeToken: 'one_time_token_456',
        provider: 'discord',
        callbackUrl: process.env.FRONTEND_CALLBACK_URL!,
        userId: null,
        codeVerifier: null,
        codeChallenge: null,
        codeChallengeMethod: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      });

      // Reset isAvailable to true for this test
      mockDiscordProvider.isAvailable.mockReturnValue(true);

      await controller.loginWithProvider(
        'discord',
        '',
        mockResponse,
        mockRequest,
      );

      expect(mockDiscordProvider.getAuthorizationUrl).toHaveBeenCalled();
      expect(mockRedirectFn).toHaveBeenCalled();
    });
  });

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

      mockAuthCoreService.createAuthenticationState = jest
        .fn()
        .mockResolvedValue(stateResult);
      mockGoogleProvider.getAuthorizationUrl.mockReturnValue(
        expectedRedirectUrl,
      );

      const authStateDto = {
        provider: 'google',
        callbackUrl: 'http://localhost:3000/auth/callback/google',
      };

      mockAuthStateService.findAuthState = jest.fn().mockResolvedValue({
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
      mockAuthCoreService.processSnsProfile = jest.fn().mockResolvedValue({
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
        token: 'jwt_token_abc123',
        jwtId: 'jwt_id_abc123',
      };

      mockAuthCoreService.verifyAndCreateToken = jest
        .fn()
        .mockResolvedValue(verifyResult);
      mockAuthService.createSession.mockResolvedValue({
        sessionId: 'session_id_abc123',
      } as any);

      const verifyDto = {
        stateCode: 'state_abc123',
        oneTimeToken: 'one_time_token_123',
      };

      // Ensure refresh token generation is mocked for the integration flow
      mockJwtTokenService.generateRefreshToken = jest
        .fn()
        .mockResolvedValue({ success: true, token: 'refresh_token_abc123' });

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
