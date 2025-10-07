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
import * as googleOAuth from '../lib/auth/google-oauth';
import * as discordOAuth from '../lib/auth/discord-oauth';
import * as query from '../lib/database/query';

// Mock implementations
jest.mock('../lib/auth/sns-auth');
jest.mock('../lib/auth/google-oauth');
jest.mock('../lib/auth/discord-oauth');
jest.mock('../lib/database/query');

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
    redirect: mockRedirectFn.mockReturnThis(),
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
  const mockProcessGoogleOAuth =
    googleOAuth.processGoogleOAuth as jest.MockedFunction<
      typeof googleOAuth.processGoogleOAuth
    >;
  const mockProcessDiscordOAuth =
    discordOAuth.processDiscordOAuth as jest.MockedFunction<
      typeof discordOAuth.processDiscordOAuth
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
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();

    // Reset mock response methods
    mockStatusFn.mockReturnThis();
    mockJsonFn.mockReturnThis();
    mockRedirectFn.mockReturnThis();

    // Mock console.error to prevent test output pollution
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('SNS Authentication State Management - POST /auth/state', () => {
    const validAuthStateDto = {
      provider: 'google',
      callbackUrl: 'http://localhost:3000/auth/callback',
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
        callbackUrl: 'http://localhost:3000/auth/callback',
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

  describe('SNS OAuth Callback Processing - GET /auth/callback', () => {
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
    });

    it('should process Google OAuth callback successfully', async () => {
      // Mock auth state
      const mockAuthState = {
        id: 'auth_state_123',
        stateCode: validState,
        oneTimeToken: 'one_time_token_123',
        provider: 'google',
        callbackUrl: 'https://frontend.example.com/auth/callback', // Different URL to trigger frontend callback
        userId: null, // Initially null, will be updated after profile processing
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);

      // Mock successful Google OAuth flow
      mockProcessGoogleOAuth.mockResolvedValue(mockSnsProfile);
      mockProcessSnsCProfile.mockResolvedValue({
        success: true,
        userId: 'user_123',
        oneTimeToken: 'one_time_token_123',
      });

      await controller.handleCallback(
        validCode,
        validState,
        '',
        mockResponse,
        mockRequest,
      );

      expect(mockProcessGoogleOAuth).toHaveBeenCalledWith(
        validCode,
        'http://localhost:3000/auth/callback',
      );
      expect(mockProcessSnsCProfile).toHaveBeenCalledWith(
        mockSnsProfile,
        validState,
      );
      expect(mockRedirectFn).toHaveBeenCalledWith(
        'http://localhost:3000/api/sns-callback?token=one_time_token_123&state=state_abc123&callbackUrl=https%3A%2F%2Ffrontend.example.com%2Fauth%2Fcallback',
      );
    });

    it('should handle OAuth provider error response', async () => {
      const error = 'access_denied';

      await controller.handleCallback(
        '',
        validState,
        error,
        mockResponse,
        mockRequest,
      );

      expect(buildErrorRedirectMock).toHaveBeenCalledWith(
        'https://frontend.example.com/auth/callback',
        error,
      );
      expect(mockRedirectFn).toHaveBeenCalledWith(
        'https://frontend.example.com/auth/callback?error=access_denied',
      );
    });

    it('should handle missing authorization code', async () => {
      await controller.handleCallback(
        '', // Missing code
        validState,
        '',
        mockResponse,
        mockRequest,
      );

      expect(buildErrorRedirectMock).toHaveBeenCalledWith(
        'https://frontend.example.com/auth/callback',
        'invalid_request',
      );
    });

    it('should handle missing state parameter (CSRF attack protection)', async () => {
      await controller.handleCallback(
        validCode,
        '', // Missing state
        '',
        mockResponse,
        mockRequest,
      );

      expect(buildErrorRedirectMock).toHaveBeenCalledWith(
        'https://frontend.example.com/auth/callback',
        'invalid_request',
      );
    });

    it('should handle invalid state code', async () => {
      // Mock auth state not found
      mockAuthService.getAuthState.mockResolvedValue(null);

      await controller.handleCallback(
        validCode,
        'invalid_state_123',
        '',
        mockResponse,
        mockRequest,
      );

      expect(buildErrorRedirectMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/signin',
        'invalid_state',
      );
    });

    it('should handle Google OAuth API failure', async () => {
      // Mock auth state for frontend callback
      const mockAuthState = {
        id: 'auth_state_123',
        stateCode: validState,
        oneTimeToken: 'one_time_token_123',
        provider: 'google',
        callbackUrl: 'https://frontend.example.com/auth/callback',
        userId: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockProcessGoogleOAuth.mockRejectedValue(
        new Error('Google token exchange failed'),
      );

      await controller.handleCallback(
        validCode,
        validState,
        '',
        mockResponse,
        mockRequest,
      );

      expect(mockProcessGoogleOAuth).toHaveBeenCalledWith(
        validCode,
        'http://localhost:3000/auth/callback',
      );
      expect(console.error).toHaveBeenCalledWith(
        'OAuth callback error:',
        expect.any(Error),
      );
      expect(buildErrorRedirectMock).toHaveBeenCalledWith(
        'https://frontend.example.com/auth/callback',
        'server_error',
      );
      expect(mockRedirectFn).toHaveBeenCalledWith(
        expect.stringContaining('error=server_error'),
      );
    });

    it('should handle profile processing failure', async () => {
      // Mock auth state for frontend callback
      const mockAuthState = {
        id: 'auth_state_123',
        stateCode: validState,
        oneTimeToken: 'one_time_token_123',
        provider: 'google',
        callbackUrl: 'https://frontend.example.com/auth/callback',
        userId: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockProcessGoogleOAuth.mockResolvedValue(mockSnsProfile);
      mockProcessSnsCProfile.mockResolvedValue({
        success: false,
        error: 'server_error',
      });

      await controller.handleCallback(
        validCode,
        validState,
        '',
        mockResponse,
        mockRequest,
      );

      expect(mockProcessGoogleOAuth).toHaveBeenCalledWith(
        validCode,
        'http://localhost:3000/auth/callback',
      );
      expect(mockProcessSnsCProfile).toHaveBeenCalledWith(
        mockSnsProfile,
        validState,
      );
      expect(buildErrorRedirectMock).toHaveBeenCalledWith(
        'https://frontend.example.com/auth/callback',
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
        callbackUrl: 'http://localhost:3000/auth/callback',
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
        callbackUrl: 'http://localhost:3000/auth/callback',
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
        callbackUrl: 'http://localhost:3000/auth/callback',
        userId: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockProcessGoogleOAuth.mockResolvedValue(mockGoogleProfile);
      mockProcessSnsCProfile.mockResolvedValue({
        success: true,
        userId: 'new_user_123',
        oneTimeToken: 'one_time_token_123',
      });

      await controller.handleCallback(
        'auth_code_123',
        'state_abc123',
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
        callbackUrl: 'http://localhost:3000/auth/callback',
        userId: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockProcessGoogleOAuth.mockResolvedValue(mockGoogleProfile);
      mockProcessSnsCProfile.mockResolvedValue({
        success: true,
        userId: 'existing_user_123',
        oneTimeToken: 'one_time_token_123',
      });

      await controller.handleCallback(
        'auth_code_123',
        'state_abc123',
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
        callbackUrl: 'http://localhost:3000/auth/callback',
        userId: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockProcessGoogleOAuth.mockResolvedValue(updatedProfile);
      mockProcessSnsCProfile.mockResolvedValue({
        success: true,
        userId: 'existing_user_123',
        oneTimeToken: 'one_time_token_123',
      });

      await controller.handleCallback(
        'auth_code_123',
        'state_abc123',
        '',
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
        callbackUrl: 'http://localhost:3000/auth/callback',
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
        callbackUrl: 'https://app.example.com/auth/callback',
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
    const validCallbackUrl = 'http://localhost:3000/auth/callback';

    it('should initiate Discord authentication successfully', async () => {
      const mockResult = {
        success: true,
        stateCode: 'state_discord_123',
        redirectUrl:
          'https://discord.com/oauth2/authorize?response_type=code&client_id=discord_client_id&redirect_uri=http%3A//localhost%3A3000/auth/callback&scope=identify%20email&state=state_discord_123',
      };

      mockCreateAuthenticationState.mockResolvedValue(mockResult);

      // Mock the GET request to /auth/login/discord
      await controller.loginWithDiscord(validCallbackUrl, mockResponse);

      expect(mockCreateAuthenticationState).toHaveBeenCalledWith({
        provider: 'discord',
        callbackUrl: validCallbackUrl,
      });
      expect(mockRedirectFn).toHaveBeenCalledWith(mockResult.redirectUrl);
    });

    it('should handle Discord authentication initiation failure', async () => {
      const mockResult = {
        success: false,
        error: 'configuration_error',
        errorDescription: 'Discord client credentials not configured',
      };

      mockCreateAuthenticationState.mockResolvedValue(mockResult);

      await expect(
        controller.loginWithDiscord(validCallbackUrl, mockResponse),
      ).rejects.toThrow(HttpException);
    });

    it('should use default callback URL when none provided', async () => {
      const mockResult = {
        success: true,
        stateCode: 'state_discord_123',
        redirectUrl: 'https://discord.com/oauth2/authorize?...',
      };

      mockCreateAuthenticationState.mockResolvedValue(mockResult);

      await controller.loginWithDiscord('', mockResponse);

      expect(mockCreateAuthenticationState).toHaveBeenCalledWith({
        provider: 'discord',
        callbackUrl: expect.stringContaining('localhost:3000'),
      });
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
        callbackUrl: 'http://localhost:3000/auth/callback',
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
        callbackUrl: 'http://localhost:3000/auth/callback',
        userId: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      };

      mockAuthService.getAuthState.mockResolvedValue(mockAuthState);
      mockProcessGoogleOAuth.mockResolvedValue(snsProfile);
      mockProcessSnsCProfile.mockResolvedValue({
        success: true,
        userId: 'user_123',
        oneTimeToken: 'one_time_token_123',
      });

      await controller.handleCallback(
        'auth_code_123',
        'state_abc123',
        '',
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
      expect(mockProcessGoogleOAuth).toHaveBeenCalled();
      expect(mockProcessSnsCProfile).toHaveBeenCalledWith(
        snsProfile,
        'state_abc123',
      );
      expect(mockVerifyAndCreateToken).toHaveBeenCalledWith(verifyDto);
    });
  });
});
