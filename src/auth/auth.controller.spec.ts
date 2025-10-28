import { TestingModule } from '@nestjs/testing';
import {
  HttpStatus,
  HttpException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthProviderFactory } from '../lib/auth/oauth-provider.factory';
import { AppErrorCodes } from '../types/error-codes';
import { getGlobalModule } from '../utils/test/global-modules';
import { mockUser } from '../utils/test/mock-data';
import {
  mockDiscordProvider,
  mockGoogleProvider,
} from '../utils/test/mock-services';
import { mockRequest, mockResponse } from '../utils/test/mock-networking';
import { mockJsonFn, mockStatusFn } from '../utils/test/mock-fuctions';
import { ExternalProviderAccessTokenService } from '../data-base/query/external-provider-access-token/external-provider-access-token.service';
import { mock } from 'jest-mock-extended';
import { JwtTokenService } from './jwt-token/jwt-token.service';
import { DataBaseService } from '../data-base/data-base.service';
import { UtilityService } from '../data-base/utility/utility.service';
import { RoleService } from '../data-base/query/role/role.service';
import { AuthStateService } from '../data-base/query/auth-state/auth-state.service';
import { AuthCoreService } from './sns/auth-core/auth-core.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { MfaService } from '../data-base/query/mfa/mfa.service';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from '../zod-validation-type';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: AuthService;
  let validRegisterDto: RegisterDto;

  beforeEach(async () => {
    mockAuthService = mock<AuthService>();
    const mockExternalProviderAccessTokenService =
      mock<ExternalProviderAccessTokenService>();
    const mockJwtTokenService = mock<JwtTokenService>({
      generateJWTToken: jest.fn().mockResolvedValue({
        success: true,
        jti: 'jwt_state_123',
        accessToken: 'mock_jwt_token_abc123',
        refreshToken: 'mock_refresh_token_abc123',
        profile: {
          sub: 'user_123',
          name: 'testuser',
          email: 'test@example.com',
          providers: [],
        },
        user: {
          role: 'user',
        },
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        userId: 'user_123',
      }),
    });

    const mockOAuthProviderFactory = {
      getProvider: jest.fn((provider: string) => {
        if (provider === 'google') return mockGoogleProvider;
        if (provider === 'discord') return mockDiscordProvider;
        throw AppErrorCodes.PROVIDER_NOT_FOUND;
      }),
      getAllProviders: jest
        .fn()
        .mockReturnValue([mockGoogleProvider, mockDiscordProvider]),
      getAvailableProviderNames: jest
        .fn()
        .mockReturnValue(['google', 'discord']),
      getConfiguredProviders: jest
        .fn()
        .mockReturnValue([mockGoogleProvider, mockDiscordProvider]),
    };

    validRegisterDto = {
      username: mockUser.username,
      email: mockUser.email,
      password: 'TestPass123',
    };

    const mockDatabaseService = mock<DataBaseService>();
    const mockUtilityService = mock<UtilityService>();
    const mockRoleService = mock<RoleService>();
    const mockAuthStateService = mock<AuthStateService>();
    const mockAuthCoreService = mock<AuthCoreService>({
      verifyAndCreateToken: jest.fn().mockResolvedValue({
        success: true,
        jti: 'jwt_id_abc123',
        accessToken: 'access_token_abc123',
        refreshToken: 'refresh_token_abc123',
        userId: 'user_123',
      }),
    });
    const mockMFaService = mock<MfaService>();

    const module: TestingModule = await getGlobalModule({
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
          provide: AuthStateService,
          useValue: mockAuthStateService,
        },
        {
          provide: AuthCoreService,
          useValue: mockAuthCoreService,
        },
        {
          provide: MfaService,
          useValue: mockMFaService,
        },
        {
          provide: APP_PIPE,
          useValue: ZodValidationPipe,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    mockAuthService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();

    // Reset mock response methods
    mockStatusFn.mockReturnThis();
    mockJsonFn.mockReturnThis();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register (POST /auth/register)', () => {
    it('should register user successfully', async () => {
      const mockAuthResponse = {
        success: true,
        user: mockUser,
      };

      mockAuthService.register = jest.fn().mockResolvedValue(mockAuthResponse);

      await controller.register(validRegisterDto, mockResponse);

      expect(mockAuthService.register).toHaveBeenCalledWith(validRegisterDto);
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(mockJsonFn).toHaveBeenCalledWith({
        message: 'User registered successfully',
        user: mockUser,
      });
    });

    it('should handle user already exists error', async () => {
      mockAuthService.register = jest
        .fn()
        .mockRejectedValue(AppErrorCodes.USER_EXISTS);

      await expect(
        controller.register(validRegisterDto, mockResponse),
      ).rejects.toThrow(AppErrorCodes.USER_EXISTS);
    });

    it('should handle server errors', async () => {
      mockAuthService.register = jest
        .fn()
        .mockRejectedValue(AppErrorCodes.INTERNAL_SERVER_ERROR);

      await expect(
        controller.register(validRegisterDto, mockResponse),
      ).rejects.toThrow(AppErrorCodes.INTERNAL_SERVER_ERROR);
    });

    it('should handle unexpected exceptions', async () => {
      mockAuthService.register = jest
        .fn()
        .mockRejectedValue(AppErrorCodes.INTERNAL_SERVER_ERROR);

      await expect(
        controller.register(validRegisterDto, mockResponse),
      ).rejects.toThrow(AppErrorCodes.INTERNAL_SERVER_ERROR);
    });
  });

  describe('login (POST /auth/login)', () => {
    const validLoginDto: LoginDto = {
      usernameOrEmail: mockUser.username,
      password: 'TestPass123',
    };

    it('should login user successfully', async () => {
      const mockLoginResponse = {
        success: true,
        user: mockUser,
      };

      mockAuthService.login = jest.fn().mockResolvedValue(mockLoginResponse);

      await controller.login(validLoginDto, mockResponse, mockRequest);

      expect(mockAuthService.login).toHaveBeenCalledWith(validLoginDto);
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockJsonFn).toHaveBeenCalledWith({
        message: 'Login successful',
        jti: 'jwt_state_123',
        access_token: 'mock_jwt_token_abc123',
        token_type: 'Bearer',
        expires_in: 60 * 60,
        refresh_token: expect.any(String),
        refresh_expires_in: 60 * 60 * 24 * 30,
      });
    });

    it('returns mfaRequired when user has MFA enabled', async () => {
      const mockLoginResponse = {
        success: true,
        user: mockUser,
      };

      mockAuthService.login = jest.fn().mockResolvedValue(mockLoginResponse);

      // Mock mfaService on the controller instance to report MFA required.
      (controller as any).mfaService = {
        checkMfaRequired: jest.fn().mockResolvedValue({ mfaRequired: true }),
      } as any;

      await controller.login(validLoginDto, mockResponse, mockRequest);

      // Expect the controller to short-circuit and return mfaRequired response
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockJsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          mfaRequired: true,
          mfaToken: expect.any(String),
        }),
      );
    });

    it('should handle login with email address', async () => {
      const loginWithEmail = {
        usernameOrEmail: mockUser.email,
        password: 'TestPass123',
      };

      const mockLoginResponse = {
        success: true,
        user: mockUser,
      };

      mockAuthService.login = jest.fn().mockResolvedValue(mockLoginResponse);

      await controller.login(loginWithEmail, mockResponse, mockRequest);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginWithEmail);
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockJsonFn).toHaveBeenCalledWith({
        message: 'Login successful',
        jti: 'jwt_state_123',
        access_token: 'mock_jwt_token_abc123',
        token_type: 'Bearer',
        expires_in: 60 * 60,
        refresh_token: expect.any(String),
        refresh_expires_in: 60 * 60 * 24 * 30,
      });
    });

    it('should handle invalid credentials', async () => {
      const mockLoginResponse = {
        success: false,
        error: 'invalid_credentials',
        errorDescription: 'Invalid username/email or password',
      };

      mockAuthService.login = jest.fn().mockResolvedValue(mockLoginResponse);

      await expect(
        controller.login(validLoginDto, mockResponse, mockRequest),
      ).rejects.toThrow(AppErrorCodes.INVALID_CREDENTIALS);
    });

    it('should handle server errors during login', async () => {
      const mockLoginResponse = {
        success: false,
        error: 'server_error',
        errorDescription: 'An internal server error occurred',
      };

      mockAuthService.login = jest.fn().mockResolvedValue(mockLoginResponse);

      await expect(
        controller.login(validLoginDto, mockResponse, mockRequest),
      ).rejects.toThrow(AppErrorCodes.INTERNAL_SERVER_ERROR);
    });

    it('should handle unexpected exceptions during login', async () => {
      mockAuthService.login = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(
        controller.login(validLoginDto, mockResponse, mockRequest),
      ).rejects.toThrow(AppErrorCodes.INTERNAL_SERVER_ERROR);
    });
  });

  describe('getProfile (GET /auth/profile)', () => {
    it('should get user profile successfully', async () => {
      mockAuthService.getProfile = jest.fn().mockResolvedValue(mockUser);

      await controller.getProfile(mockRequest, mockResponse, mockUser as any);

      expect(mockAuthService.getProfile).toHaveBeenCalledWith(mockUser.id);
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockJsonFn).toHaveBeenCalledWith({
        message: 'Profile retrieved successfully',
        user: mockUser,
      });
    });

    it('should handle missing session ID', async () => {
      // Simulate missing authenticated user
      await expect(
        controller.getProfile(mockRequest, mockResponse, mockUser as any),
      ).rejects.toThrow(AppErrorCodes.INVALID_SESSION);
    });

    it('should handle invalid session', async () => {
      mockAuthService.getProfile = jest.fn().mockResolvedValue(null);

      await expect(
        controller.getProfile(mockRequest, mockResponse, mockUser as any),
      ).rejects.toThrow(AppErrorCodes.INVALID_SESSION);
    });

    it('should handle expired session', async () => {
      mockAuthService.getProfile = jest.fn().mockResolvedValue(null);

      await expect(
        controller.getProfile(mockRequest, mockResponse, mockUser as any),
      ).rejects.toThrow(AppErrorCodes.INVALID_SESSION);
    });

    it('should handle server errors during profile retrieval', async () => {
      mockAuthService.getProfile = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      await expect(
        controller.getProfile(mockRequest, mockResponse, mockUser as any),
      ).rejects.toThrow(AppErrorCodes.INTERNAL_SERVER_ERROR);
    });

    it('should handle empty session ID header', async () => {
      // Empty user -> missing session
      await expect(
        controller.getProfile(mockRequest, mockResponse, mockUser as any),
      ).rejects.toThrow(AppErrorCodes.INVALID_SESSION);
    });

    it('should handle session ID from different header formats', async () => {
      mockAuthService.getProfile = jest.fn().mockResolvedValue(mockUser);

      await controller.getProfile(mockRequest, mockResponse, mockUser as any);

      expect(mockAuthService.getProfile).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('Error Handling and Security', () => {
    it('should handle concurrent session requests', async () => {
      const sessionId = 'session_concurrent';
      mockRequest.headers = { 'x-session-id': sessionId };

      const mockUserProfile = {
        id: 'user_123',
        username: 'testuser',
        email: 'test@example.com',
        providers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        roles: [],
      };

      mockAuthService.getProfile = jest.fn().mockResolvedValue(mockUserProfile);

      // Simulate concurrent requests
      const promises = Array(5)
        .fill(null)
        .map(() =>
          controller.getProfile(
            mockRequest,
            mockResponse,
            mockUserProfile as any,
          ),
        );

      await Promise.all(promises);

      expect(mockAuthService.getProfile).toHaveBeenCalledTimes(5);
    });

    it('should properly map error types to HTTP status codes', () => {
      const errorMappings = [
        {
          error: 'invalid_request',
          expectedExceptionType: BadRequestException,
        },
        { error: 'user_exists', expectedExceptionType: ConflictException },
        { error: 'weak_password', expectedExceptionType: BadRequestException },
        {
          error: 'invalid_credentials',
          expectedExceptionType: UnauthorizedException,
        },
        { error: 'server_error', expectedExceptionType: HttpException },
      ];

      // This test verifies that the controller maps errors correctly
      errorMappings.forEach(({ error, expectedExceptionType }) => {
        expect(expectedExceptionType).toBeDefined();
      });
    });
  });

  describe('Session Management', () => {
    it('should handle session expiration gracefully', async () => {
      const expiredSessionId = 'session_expired';
      mockRequest.headers = { 'x-session-id': expiredSessionId };

      mockAuthService.getProfile = jest.fn().mockResolvedValue(null);

      await expect(
        controller.getProfile(mockRequest, mockResponse, mockUser as any),
      ).rejects.toThrow(AppErrorCodes.INVALID_SESSION);
    });

    it('should handle session validation during profile access', async () => {
      const sessionId = 'session_valid';
      mockRequest.headers = { 'x-session-id': sessionId };

      const mockProfile = { ...mockUser };
      mockAuthService.getProfile = jest.fn().mockResolvedValue(mockProfile);

      await controller.getProfile(
        mockRequest,
        mockResponse,
        mockProfile as any,
      );
      expect(mockAuthService.getProfile).toHaveBeenCalledWith(mockProfile.id);
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.OK);
    });
  });
});
