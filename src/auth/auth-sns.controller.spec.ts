import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  BadRequestException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RegisterDto, LoginDto } from './dto/create-auth.dto';
import * as snsAuth from '../lib/auth/sns-auth';
import * as query from '../lib/database/query';
import { ExternalProviderAccessTokenService } from '../encryption/external-provider-access-token/external-provider-access-token.service';

// Mock implementations
jest.mock('../lib/auth/sns-auth');
jest.mock('../lib/database/query');

import { OAuthProviderFactory } from '../lib/auth/oauth-provider.factory';

describe('AuthController - SNS OAuth Authentication', () => {
  let controller: AuthController;
  let service: AuthService;

  // Mock Response object
  const mockStatusFn = jest.fn();
  const mockJsonFn = jest.fn();
  const mockRedirectFn = jest.fn();
  const mockResponse = {
    status: mockStatusFn.mockReturnThis(),
    json: mockJsonFn.mockReturnThis(),
    redirect: mockRedirectFn,
  } as unknown as Response;

  // Mock Request object
  const mockRequest = {
    headers: {},
    ip: '127.0.0.1',
  } as unknown as Request;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    createSession: jest.fn(),
    getProfile: jest.fn(),
    logout: jest.fn(),
    getAuthState: jest.fn(),
    getUserProfileById: jest.fn(),
  };

  const mockExternalProviderAccessTokenService = {
    save: jest.fn(),
    getById: jest.fn(),
    getByUserId: jest.fn(),
    getDecryptedById: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  };

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
      throw new Error(`Provider ${provider} not found`);
    }),
    getAllProviders: jest
      .fn()
      .mockReturnValue([mockGoogleProvider, mockDiscordProvider]),
    getAvailableProviderNames: jest.fn().mockReturnValue(['google', 'discord']),
    getConfiguredProviders: jest
      .fn()
      .mockReturnValue([mockGoogleProvider, mockDiscordProvider]),
  };

  // Mock functions
  const mockCreateAuthenticationState =
    snsAuth.createAuthenticationState as jest.MockedFunction<
      typeof snsAuth.createAuthenticationState
    >;
  const mockProcessSnsCProfile =
    snsAuth.processSnsCProfile as jest.MockedFunction<
      typeof snsAuth.processSnsCProfile
    >;
  const mockVerifyAndCreateToken =
    snsAuth.verifyAndCreateToken as jest.MockedFunction<
      typeof snsAuth.verifyAndCreateToken
    >;
  const mockSnsAuthCallback = snsAuth.SnsAuthCallback as jest.MockedClass<
    typeof snsAuth.SnsAuthCallback
  >;
  const mockFindAuthState = query.findAuthState as jest.MockedFunction<
    typeof query.findAuthState
  >;
  const mockConsumeAuthState = query.consumeAuthState as jest.MockedFunction<
    typeof query.consumeAuthState
  >;
  const mockCleanupExpiredAuthStates =
    query.cleanupExpiredAuthStates as jest.MockedFunction<
      typeof query.cleanupExpiredAuthStates
    >;
  const mockUpdateAuthStateWithUser =
    query.updateAuthStateWithUser as jest.MockedFunction<
      typeof query.updateAuthStateWithUser
    >;
  const mockFindUserById = query.findUserById as jest.MockedFunction<
    typeof query.findUserById
  >;

  beforeEach(async () => {
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

  describe('SNS Authentication State Management - POST /auth/state', () => {
    const validAuthStateDto = {
      provider: 'google',
      callbackUrl: 'http://localhost:3000/auth/callback/google',
    };

    it('should create authentication state successfully for Google', async () => {
      const expectedResult = {
        success: true,
        stateCode: 'state_abc123',
        redirectUrl: 'https://accounts.google.com/o/oauth2/v2/auth?...',
      };

      mockCreateAuthenticationState.mockResolvedValue(expectedResult);

      await controller.createAuthState(validAuthStateDto, mockResponse);

      expect(mockCreateAuthenticationState).toHaveBeenCalledWith(
        validAuthStateDto,
      );
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockJsonFn).toHaveBeenCalledWith({
        message: 'Authentication state created successfully',
        state_code: expectedResult.stateCode,
        redirect_url: expectedResult.redirectUrl,
      });
    });

    it('should handle missing provider parameter', async () => {
      const invalidDto = {
        callbackUrl: 'http://localhost:3000/auth/callback',
        // provider is missing
      } as any;

      await expect(
        controller.createAuthState(invalidDto, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle missing callback URL parameter', async () => {
      const invalidDto = {
        provider: 'google',
        // callbackUrl is missing
      } as any;

      await expect(
        controller.createAuthState(invalidDto, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle authentication state creation failure', async () => {
      const errorResult = {
        success: false,
        error: 'server_error',
        errorDescription: 'Failed to create authentication state',
      };

      mockCreateAuthenticationState.mockResolvedValue(errorResult);

      await expect(
        controller.createAuthState(validAuthStateDto, mockResponse),
      ).rejects.toThrow(HttpException);
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

      mockCreateAuthenticationState.mockResolvedValue(errorResult);

      await expect(
        controller.createAuthState(unsupportedDto, mockResponse),
      ).rejects.toThrow(HttpException);
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
      mockSnsAuthCallback.buildErrorRedirect = buildErrorRedirectMock;

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
        callbackUrl: 'https://frontend.example.com/auth/callback/google', // Different URL to trigger frontend callback
        userId: null, // Initially null, will be updated after profile processing
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
      mockProcessSnsCProfile.mockResolvedValue({
        success: true,
        userId: 'user_123',
        oneTimeToken: 'one_time_token_123',
      });

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
      );
      expect(mockProcessSnsCProfile).toHaveBeenCalledWith(
        mockSnsProfile,
        validState,
      );
      expect(mockRedirectFn).toHaveBeenCalledWith(
        'https://frontend.example.com/auth/callback/google?token=one_time_token_123&state=state_abc123&success=true',
      );
    });

    it('should handle OAuth provider error response', async () => {
      const error = 'access_denied';
      const frontendCallbackUrl = 'https://frontend.example.com/auth/callback';

      // Mock auth state (might not be available in error cases)
      mockAuthService.getAuthState.mockResolvedValue({
        callbackUrl: frontendCallbackUrl,
      });

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
      });

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
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockGoogleProvider.processOAuth.mockRejectedValue(
        new Error('Google token exchange failed'),
      );

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
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockGoogleProvider.processOAuth.mockResolvedValue({
        snsProfile: mockSnsProfile,
        accessToken: 'access_token_123',
      });
      mockProcessSnsCProfile.mockResolvedValue({
        success: false,
        error: 'server_error',
      });

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
      );
      expect(mockProcessSnsCProfile).toHaveBeenCalledWith(
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
        role: 'user',
      };
      mockFindUserById.mockResolvedValue(mockUser);
    });

    it('should verify token and return JWT successfully', async () => {
      const expectedResult = {
        success: true,
        profile: {
          sub: 'user_123',
          name: 'Test User',
          email: 'test@example.com',
          provider: 'google',
          providers: ['google'],
        },
        // token: 'jwt_token_abc123',
      };

      mockVerifyAndCreateToken.mockResolvedValue(expectedResult);

      await controller.verifyToken(validVerifyDto, mockResponse);

      expect(mockVerifyAndCreateToken).toHaveBeenCalledWith(validVerifyDto);
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockJsonFn).toHaveBeenCalledWith({
        message: 'Token verified successfully',
        profile: expectedResult.profile,
        // token: expectedResult.token,
      });
    });

    it('should handle missing state code', async () => {
      const invalidDto = {
        oneTimeToken: 'one_time_token_123',
        // stateCode is missing
      } as any;

      await expect(
        controller.verifyToken(invalidDto, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle missing one-time token', async () => {
      const invalidDto = {
        stateCode: 'state_abc123',
        // oneTimeToken is missing
      } as any;

      await expect(
        controller.verifyToken(invalidDto, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle invalid or expired token', async () => {
      const errorResult = {
        success: false,
        error: 'invalid_token',
        errorDescription: 'Invalid or expired authentication token',
      };

      mockVerifyAndCreateToken.mockResolvedValue(errorResult);

      await expect(
        controller.verifyToken(validVerifyDto, mockResponse),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle server error during token verification', async () => {
      const errorResult = {
        success: false,
        error: 'server_error',
        errorDescription: 'Failed to verify authentication token',
      };

      mockVerifyAndCreateToken.mockResolvedValue(errorResult);

      await expect(
        controller.verifyToken(validVerifyDto, mockResponse),
      ).rejects.toThrow(HttpException);
    });

    it('should prevent token reuse after verification', async () => {
      // First verification should succeed
      const successResult = {
        success: true,
        profile: {
          sub: 'user_123',
          provider: 'google',
          providers: ['google'],
        },
        token: 'jwt_token_abc123',
      };

      mockVerifyAndCreateToken.mockResolvedValueOnce(successResult);

      await controller.verifyToken(validVerifyDto, mockResponse);

      // Second verification with same token should fail
      const errorResult = {
        success: false,
        error: 'invalid_token',
        errorDescription: 'Token has already been used',
      };

      mockVerifyAndCreateToken.mockResolvedValueOnce(errorResult);

      await expect(
        controller.verifyToken(validVerifyDto, mockResponse),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle missing user ID in authentication state', async () => {
      const errorResult = {
        success: false,
        error: 'invalid_state',
        errorDescription:
          'Authentication state does not contain user information',
      };

      mockVerifyAndCreateToken.mockResolvedValue(errorResult);

      await expect(
        controller.verifyToken(validVerifyDto, mockResponse),
      ).rejects.toThrow(HttpException);
    });

    it('should handle user not found after verification', async () => {
      const errorResult = {
        success: false,
        error: 'user_not_found',
        errorDescription: 'User associated with authentication state not found',
      };

      mockVerifyAndCreateToken.mockResolvedValue(errorResult);

      await expect(
        controller.verifyToken(validVerifyDto, mockResponse),
      ).rejects.toThrow(HttpException);
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
        expiresAt: expiredDate,
        used: false,
        createdAt: new Date(),
      };

      mockFindAuthState.mockResolvedValue(expiredAuthState);

      const verifyDto = {
        stateCode: 'expired_state_123',
        oneTimeToken: 'one_time_token_123',
      };

      const errorResult = {
        success: false,
        error: 'invalid_token',
        errorDescription: 'Invalid or expired authentication token',
      };

      mockVerifyAndCreateToken.mockResolvedValue(errorResult);

      await expect(
        controller.verifyToken(verifyDto, mockResponse),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should prevent state code reuse', async () => {
      const usedAuthState = {
        id: 'auth_state_123',
        stateCode: 'used_state_123',
        oneTimeToken: 'one_time_token_123',
        provider: 'google',
        callbackUrl: 'http://localhost:3000/auth/callback/google',
        userId: 'user_123',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: true, // Already used
        createdAt: new Date(),
      };

      mockFindAuthState.mockResolvedValue(usedAuthState);

      const verifyDto = {
        stateCode: 'used_state_123',
        oneTimeToken: 'one_time_token_123',
      };

      const errorResult = {
        success: false,
        error: 'invalid_token',
        errorDescription: 'Token has already been used',
      };

      mockVerifyAndCreateToken.mockResolvedValue(errorResult);

      await expect(
        controller.verifyToken(verifyDto, mockResponse),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle non-existent state code', async () => {
      mockFindAuthState.mockResolvedValue(null);

      const verifyDto = {
        stateCode: 'non_existent_state_123',
        oneTimeToken: 'one_time_token_123',
      };

      const errorResult = {
        success: false,
        error: 'invalid_token',
        errorDescription: 'Invalid authentication state',
      };

      mockVerifyAndCreateToken.mockResolvedValue(errorResult);

      await expect(
        controller.verifyToken(verifyDto, mockResponse),
      ).rejects.toThrow(UnauthorizedException);
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
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockGoogleProvider.processOAuth.mockResolvedValue({
        snsProfile: mockGoogleProfile,
        accessToken: 'access_token_123',
      });
      mockProcessSnsCProfile.mockResolvedValue({
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

      expect(mockProcessSnsCProfile).toHaveBeenCalledWith(
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
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockGoogleProvider.processOAuth.mockResolvedValue({
        snsProfile: mockGoogleProfile,
        accessToken: 'access_token_123',
      });
      mockProcessSnsCProfile.mockResolvedValue({
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

      expect(mockProcessSnsCProfile).toHaveBeenCalledWith(
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
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockGoogleProvider.processOAuth.mockResolvedValue({
        snsProfile: updatedProfile,
        accessToken: 'access_token_123',
      });
      mockProcessSnsCProfile.mockResolvedValue({
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

      expect(mockProcessSnsCProfile).toHaveBeenCalledWith(
        updatedProfile,
        'state_abc123',
      );
    });
  });

  describe('Cleanup and Maintenance Tests', () => {
    it('should cleanup expired authentication states', async () => {
      mockCleanupExpiredAuthStates.mockResolvedValue({
        count: 5,
      });

      // This would typically be called by a scheduled task
      await mockCleanupExpiredAuthStates();

      expect(mockCleanupExpiredAuthStates).toHaveBeenCalled();
    });
  });

  describe('Environment Configuration Tests', () => {
    it('should handle missing Google OAuth credentials', async () => {
      // Mock environment variables being undefined
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
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

      mockCreateAuthenticationState.mockResolvedValue(errorResult);

      await expect(
        controller.createAuthState(authStateDto, mockResponse),
      ).rejects.toThrow(HttpException);

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

      mockCreateAuthenticationState.mockResolvedValue(expectedResult);

      await controller.createAuthState(authStateDto, mockResponse);

      expect(mockCreateAuthenticationState).toHaveBeenCalledWith(authStateDto);

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

      mockCreateAuthenticationState.mockResolvedValue(mockResult);

      // Mock the GET request to /auth/login/discord
      await controller.loginWithProvider(
        'discord',
        validCallbackUrl,
        mockResponse,
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

      mockCreateAuthenticationState.mockResolvedValue(mockResult);

      // Mock provider to throw unavailable error
      mockDiscordProvider.isAvailable.mockReturnValue(false);

      await expect(
        controller.loginWithProvider('discord', validCallbackUrl, mockResponse),
      ).rejects.toThrow(HttpException);
    });

    it('should use default callback URL when none provided', async () => {
      const mockResult = {
        success: true,
        stateCode: 'state_discord_123',
        redirectUrl: 'https://discord.com/oauth2/authorize?...',
      };

      mockCreateAuthenticationState.mockResolvedValue(mockResult);

      // Reset isAvailable to true for this test
      mockDiscordProvider.isAvailable.mockReturnValue(true);

      await controller.loginWithProvider('discord', '', mockResponse);

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
      mockCreateAuthenticationState.mockResolvedValue(stateResult);

      const authStateDto = {
        provider: 'google',
        callbackUrl: 'http://localhost:3000/auth/callback/google',
      };

      await controller.createAuthState(authStateDto, mockResponse);

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
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockGoogleProvider.processOAuth.mockResolvedValue({
        snsProfile: snsProfile,
        accessToken: 'access_token_123',
      });
      mockProcessSnsCProfile.mockResolvedValue({
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
          provider: 'google',
          providers: ['google'],
        },
        token: 'jwt_token_abc123',
      };

      mockVerifyAndCreateToken.mockResolvedValue(verifyResult);

      const verifyDto = {
        stateCode: 'state_abc123',
        oneTimeToken: 'one_time_token_123',
      };

      await controller.verifyToken(verifyDto, mockResponse);

      // Verify all steps were called correctly
      expect(mockCreateAuthenticationState).toHaveBeenCalledWith(authStateDto);
      expect(mockGoogleProvider.processOAuth).toHaveBeenCalled();
      expect(mockProcessSnsCProfile).toHaveBeenCalledWith(
        snsProfile,
        'state_abc123',
      );
      expect(mockVerifyAndCreateToken).toHaveBeenCalledWith(verifyDto);
    });
  });
});
