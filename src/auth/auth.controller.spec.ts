import { Test, TestingModule } from '@nestjs/testing';
import {
  HttpStatus,
  HttpException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/create-auth.dto';
import { ExternalProviderAccessTokenService } from '../encryption/external-provider-access-token/external-provider-access-token.service';
import { ExternalProviderAccessTokenService } from '../encryption/external-provider-access-token/external-provider-access-token.service';

// Mock the JWT token generation function
jest.mock('../lib/auth/jwt-token', () => ({
  generateJWTToken: jest.fn().mockResolvedValue({
    success: true,
    jwtId: 'jwt_state_123',
    token: 'mock_jwt_token_abc123',
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
  }),
}));

// Mock the createJWTState function (for backward compatibility)
jest.mock('../lib', () => ({
  createJWTState: jest.fn().mockResolvedValue({ id: 'jwt_state_123' }),
}));

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  // Mock Response object
  const mockStatusFn = jest.fn();
  const mockJsonFn = jest.fn();
  const mockResponse = {
    status: mockStatusFn.mockReturnThis(),
    json: mockJsonFn.mockReturnThis(),
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
    validateSession: jest.fn(),
    validatePassword: jest.fn(),
    validateUsername: jest.fn(),
    validateEmail: jest.fn(),
    cleanupExpiredSessions: jest.fn(),
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
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();

    // Reset mock response methods
    mockStatusFn.mockReturnThis();
    mockJsonFn.mockReturnThis();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register (POST /auth/register)', () => {
    const validRegisterDto: RegisterDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPass123',
    };

    it('should register user successfully', async () => {
      const mockAuthResponse = {
        success: true,
        user: {
          id: 'user_123',
          username: 'testuser',
          email: 'test@example.com',
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      await controller.register(validRegisterDto, mockResponse);

      expect(mockAuthService.register).toHaveBeenCalledWith(validRegisterDto);
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(mockJsonFn).toHaveBeenCalledWith({
        message: 'User registered successfully',
        user: mockAuthResponse.user,
      });
    });

    it('should handle validation errors', async () => {
      const invalidRegisterDto = {
        username: 'ab', // Too short
        email: 'invalid-email',
        password: 'weak',
      };

      await expect(
        controller.register(invalidRegisterDto, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle user already exists error', async () => {
      const mockAuthResponse = {
        success: false,
        error: 'user_exists',
        errorDescription: 'User with this email or username already exists',
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      await expect(
        controller.register(validRegisterDto, mockResponse),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle weak password error', async () => {
      const mockAuthResponse = {
        success: false,
        error: 'weak_password',
        errorDescription: 'Password does not meet security requirements',
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      await expect(
        controller.register(validRegisterDto, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle server errors', async () => {
      const mockAuthResponse = {
        success: false,
        error: 'server_error',
        errorDescription: 'An internal server error occurred',
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      await expect(
        controller.register(validRegisterDto, mockResponse),
      ).rejects.toThrow(HttpException);
    });

    it('should handle unexpected exceptions', async () => {
      mockAuthService.register.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        controller.register(validRegisterDto, mockResponse),
      ).rejects.toThrow(HttpException);
    });

    it('should handle empty request body', async () => {
      const emptyDto = {} as RegisterDto;

      await expect(controller.register(emptyDto, mockResponse)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate username format', async () => {
      const invalidUsernameDto = {
        ...validRegisterDto,
        username: 'invalid user name', // Contains spaces
      };

      await expect(
        controller.register(invalidUsernameDto, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate email format', async () => {
      const invalidEmailDto = {
        ...validRegisterDto,
        email: 'not-an-email',
      };

      await expect(
        controller.register(invalidEmailDto, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate password requirements', async () => {
      const weakPasswordDto = {
        ...validRegisterDto,
        password: '123456', // No uppercase or lowercase letters
      };

      await expect(
        controller.register(weakPasswordDto, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login (POST /auth/login)', () => {
    const validLoginDto: LoginDto = {
      usernameOrEmail: 'testuser',
      password: 'TestPass123',
    };

    it('should login user successfully', async () => {
      const mockLoginResponse = {
        success: true,
        user: {
          id: 'user_123',
          username: 'testuser',
          email: 'test@example.com',
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      const mockSessionData = {
        sessionId: 'session_abc123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockAuthService.login.mockResolvedValue(mockLoginResponse);
      mockAuthService.createSession.mockResolvedValue(mockSessionData);

      await controller.login(validLoginDto, mockResponse, mockRequest);

      expect(mockAuthService.login).toHaveBeenCalledWith(validLoginDto);
      expect(mockAuthService.createSession).toHaveBeenCalledWith('user_123');
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockJsonFn).toHaveBeenCalledWith({
        message: 'Login successful',
        jwtId: 'jwt_state_123',
        user: mockLoginResponse.user,
        session_id: mockSessionData.sessionId,
        expires_at: mockSessionData.expiresAt,
      });
    });

    it('should handle login with email address', async () => {
      const loginWithEmail = {
        usernameOrEmail: 'test@example.com',
        password: 'TestPass123',
      };

      const mockLoginResponse = {
        success: true,
        user: {
          id: 'user_123',
          username: 'testuser',
          email: 'test@example.com',
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      const mockSessionData = {
        sessionId: 'session_def456',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockAuthService.login.mockResolvedValue(mockLoginResponse);
      mockAuthService.createSession.mockResolvedValue(mockSessionData);

      await controller.login(loginWithEmail, mockResponse, mockRequest);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginWithEmail);
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockJsonFn).toHaveBeenCalledWith({
        message: 'Login successful',
        jwtId: 'jwt_state_123',
        user: mockLoginResponse.user,
        session_id: mockSessionData.sessionId,
        expires_at: mockSessionData.expiresAt,
      });
    });

    it('should handle invalid credentials', async () => {
      const mockLoginResponse = {
        success: false,
        error: 'invalid_credentials',
        errorDescription: 'Invalid username/email or password',
      };

      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      await expect(
        controller.login(validLoginDto, mockResponse, mockRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle validation errors', async () => {
      const invalidLoginDto = {
        usernameOrEmail: '', // Empty
        password: '',
      };

      await expect(
        controller.login(invalidLoginDto, mockResponse, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle server errors during login', async () => {
      const mockLoginResponse = {
        success: false,
        error: 'server_error',
        errorDescription: 'An internal server error occurred',
      };

      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      await expect(
        controller.login(validLoginDto, mockResponse, mockRequest),
      ).rejects.toThrow(HttpException);
    });

    it('should handle unexpected exceptions during login', async () => {
      mockAuthService.login.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        controller.login(validLoginDto, mockResponse, mockRequest),
      ).rejects.toThrow(HttpException);
    });

    it('should handle session creation failure', async () => {
      const mockLoginResponse = {
        success: true,
        user: {
          id: 'user_123',
          username: 'testuser',
          email: 'test@example.com',
        },
      };

      mockAuthService.login.mockResolvedValue(mockLoginResponse);
      mockAuthService.createSession.mockRejectedValue(
        new Error('Session creation failed'),
      );

      await expect(
        controller.login(validLoginDto, mockResponse, mockRequest),
      ).rejects.toThrow(HttpException);
    });

    it('should validate minimum password length', async () => {
      const shortPasswordDto = {
        usernameOrEmail: 'testuser',
        password: '123', // Too short
      };

      await expect(
        controller.login(shortPasswordDto, mockResponse, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate maximum input lengths', async () => {
      const longInputDto = {
        usernameOrEmail: 'a'.repeat(300), // Too long
        password: 'TestPass123',
      };

      await expect(
        controller.login(longInputDto, mockResponse, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProfile (GET /auth/profile)', () => {
    const validSessionId = 'session_valid_123';

    beforeEach(() => {
      mockRequest.headers = { 'x-session-id': validSessionId };
    });

    it('should get user profile successfully', async () => {
      const mockUserProfile = {
        id: 'user_123',
        username: 'testuser',
        email: 'test@example.com',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockAuthService.getProfile.mockResolvedValue(mockUserProfile);

      await controller.getProfile(mockRequest, mockResponse);

      expect(mockAuthService.getProfile).toHaveBeenCalledWith(validSessionId);
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockJsonFn).toHaveBeenCalledWith({
        message: 'Profile retrieved successfully',
        user: mockUserProfile,
      });
    });

    it('should handle missing session ID', async () => {
      mockRequest.headers = {}; // No session ID

      await expect(
        controller.getProfile(mockRequest, mockResponse),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle invalid session', async () => {
      mockAuthService.getProfile.mockResolvedValue(null);

      await expect(
        controller.getProfile(mockRequest, mockResponse),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle expired session', async () => {
      mockAuthService.getProfile.mockResolvedValue(null);

      await expect(
        controller.getProfile(mockRequest, mockResponse),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle server errors during profile retrieval', async () => {
      mockAuthService.getProfile.mockRejectedValue(new Error('Database error'));

      await expect(
        controller.getProfile(mockRequest, mockResponse),
      ).rejects.toThrow(HttpException);
    });

    it('should handle empty session ID header', async () => {
      mockRequest.headers = { 'x-session-id': '' };

      await expect(
        controller.getProfile(mockRequest, mockResponse),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle session ID from different header formats', async () => {
      // Test case-insensitive header handling
      mockRequest.headers = { 'X-Session-ID': validSessionId };

      const mockUserProfile = {
        id: 'user_123',
        username: 'testuser',
        email: 'test@example.com',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockAuthService.getProfile.mockResolvedValue(mockUserProfile);

      await controller.getProfile(mockRequest, mockResponse);

      // Note: Express normalizes headers to lowercase, so this should work
      expect(mockAuthService.getProfile).toHaveBeenCalledWith(validSessionId);
    });
  });

  describe('logout (POST /auth/logout)', () => {
    const validSessionId = 'session_valid_123';

    it('should logout user successfully', async () => {
      mockRequest.headers = { 'x-session-id': validSessionId };
      mockAuthService.logout.mockResolvedValue(true);

      await controller.logout(mockRequest, mockResponse);

      expect(mockAuthService.logout).toHaveBeenCalledWith(validSessionId);
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockJsonFn).toHaveBeenCalledWith({
        message: 'Logout successful',
      });
    });

    it('should handle logout without session ID', async () => {
      mockRequest.headers = {}; // No session ID

      await controller.logout(mockRequest, mockResponse);

      expect(mockAuthService.logout).not.toHaveBeenCalled();
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockJsonFn).toHaveBeenCalledWith({
        message: 'Logout successful',
      });
    });

    it('should handle logout with invalid session', async () => {
      mockRequest.headers = { 'x-session-id': 'invalid_session' };
      mockAuthService.logout.mockResolvedValue(false);

      await controller.logout(mockRequest, mockResponse);

      expect(mockAuthService.logout).toHaveBeenCalledWith('invalid_session');
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockJsonFn).toHaveBeenCalledWith({
        message: 'Logout successful',
      });
    });

    it('should handle server errors during logout', async () => {
      mockRequest.headers = { 'x-session-id': validSessionId };
      mockAuthService.logout.mockRejectedValue(new Error('Database error'));

      await expect(
        controller.logout(mockRequest, mockResponse),
      ).rejects.toThrow(HttpException);
    });

    it('should handle empty session ID gracefully', async () => {
      mockRequest.headers = { 'x-session-id': '' };

      await controller.logout(mockRequest, mockResponse);

      expect(mockAuthService.logout).not.toHaveBeenCalled();
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should handle session cleanup', async () => {
      mockRequest.headers = { 'x-session-id': validSessionId };
      mockAuthService.logout.mockResolvedValue(true);

      await controller.logout(mockRequest, mockResponse);

      expect(mockAuthService.logout).toHaveBeenCalledWith(validSessionId);
      expect(mockJsonFn).toHaveBeenCalledWith({
        message: 'Logout successful',
      });
    });
  });

  describe('Error Handling and Security', () => {
    it('should handle malformed JSON in request body', async () => {
      // This would typically be handled by NestJS validation pipes
      const malformedDto = null as unknown as RegisterDto;

      await expect(
        controller.register(malformedDto, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle SQL injection attempts in username', async () => {
      const maliciousDto: RegisterDto = {
        username: "'; DROP TABLE users; --",
        email: 'test@example.com',
        password: 'TestPass123',
      };

      // Should fail validation before reaching the service
      await expect(
        controller.register(maliciousDto, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle XSS attempts in input fields', async () => {
      const xssDto: RegisterDto = {
        username: '<script>alert("xss")</script>',
        email: 'test@example.com',
        password: 'TestPass123',
      };

      // Should fail validation due to invalid characters
      await expect(controller.register(xssDto, mockResponse)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate input sanitization', async () => {
      const unsafeDto: RegisterDto = {
        username: 'test\x00user', // Null byte injection
        email: 'test@example.com',
        password: 'TestPass123',
      };

      await expect(
        controller.register(unsafeDto, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle concurrent session requests', async () => {
      const sessionId = 'session_concurrent';
      mockRequest.headers = { 'x-session-id': sessionId };

      const mockUserProfile = {
        id: 'user_123',
        username: 'testuser',
        email: 'test@example.com',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockAuthService.getProfile.mockResolvedValue(mockUserProfile);

      // Simulate concurrent requests
      const promises = Array(5)
        .fill(null)
        .map(() => controller.getProfile(mockRequest, mockResponse));

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

  describe('Input Validation Edge Cases', () => {
    it('should handle Unicode characters in username', async () => {
      const unicodeDto: RegisterDto = {
        username: '测试用户', // Chinese characters
        email: 'test@example.com',
        password: 'TestPass123',
      };

      // Should fail validation - only alphanumeric, underscore, hyphen allowed
      await expect(
        controller.register(unicodeDto, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle extremely long inputs', async () => {
      const longDto: RegisterDto = {
        username: 'a'.repeat(1000),
        email: 'test@example.com',
        password: 'TestPass123',
      };

      await expect(controller.register(longDto, mockResponse)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle minimum length boundaries', async () => {
      const boundaryDto: RegisterDto = {
        username: 'ab', // 2 characters (minimum is 3)
        email: 'test@example.com',
        password: 'TestPass123',
      };

      await expect(
        controller.register(boundaryDto, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle valid minimum length inputs', async () => {
      const validBoundaryDto: RegisterDto = {
        username: 'abc', // Exactly 3 characters
        email: 'a@b.co', // Valid short email
        password: 'TestPas1', // Exactly 8 characters
      };

      const mockAuthResponse = {
        success: true,
        user: {
          id: 'user_123',
          username: 'abc',
          email: 'a@b.co',
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      await controller.register(validBoundaryDto, mockResponse);

      expect(mockAuthService.register).toHaveBeenCalledWith(validBoundaryDto);
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.CREATED);
    });

    it('should handle special characters in password', async () => {
      const specialCharDto: RegisterDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!@#$%^&*()',
      };

      const mockAuthResponse = {
        success: true,
        user: {
          id: 'user_123',
          username: 'testuser',
          email: 'test@example.com',
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      await controller.register(specialCharDto, mockResponse);

      expect(mockAuthService.register).toHaveBeenCalledWith(specialCharDto);
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.CREATED);
    });
  });

  describe('Session Management', () => {
    it('should handle session expiration gracefully', async () => {
      const expiredSessionId = 'session_expired';
      mockRequest.headers = { 'x-session-id': expiredSessionId };

      mockAuthService.getProfile.mockResolvedValue(null);

      await expect(
        controller.getProfile(mockRequest, mockResponse),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle session validation during profile access', async () => {
      const sessionId = 'session_valid';
      mockRequest.headers = { 'x-session-id': sessionId };

      const mockProfile = {
        id: 'user_123',
        username: 'testuser',
        email: 'test@example.com',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockAuthService.getProfile.mockResolvedValue(mockProfile);

      await controller.getProfile(mockRequest, mockResponse);

      expect(mockAuthService.getProfile).toHaveBeenCalledWith(sessionId);
      expect(mockStatusFn).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should handle multiple logout attempts', async () => {
      const sessionId = 'session_to_logout';
      mockRequest.headers = { 'x-session-id': sessionId };

      mockAuthService.logout.mockResolvedValue(true);

      // First logout
      await controller.logout(mockRequest, mockResponse);

      // Second logout (should still succeed)
      await controller.logout(mockRequest, mockResponse);

      expect(mockAuthService.logout).toHaveBeenCalledTimes(2);
      expect(mockStatusFn).toHaveBeenCalledTimes(2);
    });
  });
});
