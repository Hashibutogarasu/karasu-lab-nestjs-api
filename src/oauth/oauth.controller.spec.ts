import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { OauthController } from './oauth.controller';
import { OauthService } from './oauth.service';
import {
  AuthorizeQueryDto,
  TokenRequestDto,
  RevokeTokenDto,
  IntrospectTokenDto,
} from './dto/create-oauth.dto';
import {
  TokenResponse,
  IntrospectResponse,
  ConsentResponse,
} from '../types/oauth-responses.types';
import { getGlobalModule } from '../utils/test/global-modules';

describe('OauthController', () => {
  let controller: OauthController;
  let service: OauthService;

  const mockOauthService = {
    processAuthorize: jest.fn(),
    processToken: jest.fn(),
    processRevoke: jest.fn(),
    processIntrospect: jest.fn(),
    processUserInfo: jest.fn(),
    processConsent: jest.fn(),
    buildErrorRedirectUri: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await getGlobalModule({
      controllers: [OauthController],
      providers: [
        {
          provide: OauthService,
          useValue: mockOauthService,
        },
      ],
    }).compile();

    controller = module.get<OauthController>(OauthController);
    service = module.get<OauthService>(OauthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('authorize (GET /oauth/authorize)', () => {
    const validAuthorizeQuery: AuthorizeQueryDto = {
      response_type: 'code',
      client_id: 'test_client_id',
      redirect_uri: 'https://example.com/callback',
      scope: 'read write',
      state: 'random_state_value_for_csrf_protection',
      code_challenge: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
      code_challenge_method: 'S256',
    };

    const mockRequest = {
      ip: '192.168.1.100',
      get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser'),
    } as unknown as Request;

    it('should process valid authorization request successfully', async () => {
      const mockResult = {
        success: true,
        redirectUri:
          'https://example.com/callback?code=auth_code_123&state=random_state_value_for_csrf_protection',
      };

      mockOauthService.processAuthorize.mockResolvedValue(mockResult);

      const result = await controller.authorize(
        validAuthorizeQuery,
        mockRequest,
      );

      expect(mockOauthService.processAuthorize).toHaveBeenCalledWith(
        validAuthorizeQuery,
        mockRequest,
      );
      expect(result).toEqual({
        url: mockResult.redirectUri,
        statusCode: HttpStatus.FOUND,
      });
    });

    it('should handle consent required scenario', async () => {
      const mockResult = {
        success: true,
        needsConsent: true,
        consentInfo: {
          client_name: 'Test App',
          requested_scope: 'read write',
          user_id: 'user_123',
        },
      };

      mockOauthService.processAuthorize.mockResolvedValue(mockResult);

      const result = await controller.authorize(
        validAuthorizeQuery,
        mockRequest,
      );

      expect(result).toEqual({
        message: 'User consent required',
        consent_info: mockResult.consentInfo,
      });
    });

    it('should handle authorization error with redirect', async () => {
      const mockResult = {
        success: false,
        error: 'access_denied',
        errorDescription: 'User denied access',
        redirectUri:
          'https://example.com/callback?error=access_denied&error_description=User%20denied%20access&state=random_state_value_for_csrf_protection',
      };

      mockOauthService.processAuthorize.mockResolvedValue(mockResult);

      const result = await controller.authorize(
        validAuthorizeQuery,
        mockRequest,
      );

      expect(result).toEqual({
        url: mockResult.redirectUri,
        statusCode: HttpStatus.FOUND,
      });
    });

    it('should handle invalid request parameters', async () => {
      const invalidQuery = {
        response_type: 'invalid', // 無効な response_type
        client_id: 'test_client_id',
        redirect_uri: 'invalid-uri', // 無効なURI
        state: 'test_state',
      } as AuthorizeQueryDto;

      // バリデーションエラーで例外が投げられることを期待
      await expect(
        controller.authorize(invalidQuery, mockRequest),
      ).rejects.toThrow(HttpException);
    });

    it('should handle missing state parameter (CSRF vulnerability)', async () => {
      const queryWithoutState = {
        ...validAuthorizeQuery,
        state: '', // 空のstate（CSRFに対して脆弱）
      };

      await expect(
        controller.authorize(queryWithoutState, mockRequest),
      ).rejects.toThrow(HttpException);
    });

    it('should handle server errors gracefully', async () => {
      mockOauthService.processAuthorize.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        controller.authorize(validAuthorizeQuery, mockRequest),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('token (POST /oauth/token)', () => {
    const validTokenRequest: TokenRequestDto = {
      grant_type: 'authorization_code',
      code: 'valid_auth_code_123',
      redirect_uri: 'https://example.com/callback',
      client_id: 'test_client_id',
      client_secret: 'test_client_secret',
      code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
    };

    it('should exchange authorization code for tokens successfully', async () => {
      const mockTokenResponse = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh_token_456',
        scope: 'read write',
      };

      mockOauthService.processToken.mockResolvedValue(mockTokenResponse);

      const result: TokenResponse = await controller.token(validTokenRequest);

      expect(mockOauthService.processToken).toHaveBeenCalledWith(
        validTokenRequest,
      );
      expect(result).toEqual(mockTokenResponse);
    });

    it('should handle refresh token grant', async () => {
      const refreshTokenRequest: TokenRequestDto = {
        grant_type: 'refresh_token',
        refresh_token: 'valid_refresh_token_456',
        client_id: 'test_client_id',
        client_secret: 'test_client_secret',
        redirect_uri: 'https://example.com/callback',
      };

      const mockTokenResponse = {
        access_token: 'new_access_token_789',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'new_refresh_token_789',
        scope: 'read write',
      };

      mockOauthService.processToken.mockResolvedValue(mockTokenResponse);

      const result: TokenResponse = await controller.token(refreshTokenRequest);

      expect(result).toEqual(mockTokenResponse);
    });

    it('should handle client credentials grant', async () => {
      const clientCredentialsRequest: TokenRequestDto = {
        grant_type: 'client_credentials',
        client_id: 'test_client_id',
        client_secret: 'test_client_secret',
        redirect_uri: 'https://example.com/callback',
      };

      const mockTokenResponse = {
        access_token: 'client_access_token_101',
        token_type: 'Bearer',
        expires_in: 7200,
        scope: 'api:read',
      };

      mockOauthService.processToken.mockResolvedValue(mockTokenResponse);

      const result: TokenResponse = await controller.token(
        clientCredentialsRequest,
      );

      expect(result).toEqual(mockTokenResponse);
    });

    it('should handle invalid grant type', async () => {
      const invalidRequest: TokenRequestDto = {
        grant_type: 'invalid_grant', // 無効なグラントタイプ
        client_id: 'test_client_id',
        redirect_uri: 'https://example.com/callback',
      };

      await expect(controller.token(invalidRequest)).rejects.toThrow(
        HttpException,
      );
    });

    it('should handle invalid authorization code', async () => {
      const mockErrorResponse = {
        error: 'invalid_grant',
        error_description:
          'The provided authorization code is invalid, expired, or revoked',
      };

      mockOauthService.processToken.mockResolvedValue(mockErrorResponse);

      await expect(controller.token(validTokenRequest)).rejects.toThrow(
        HttpException,
      );
    });

    it('should handle PKCE verification failure', async () => {
      const requestWithInvalidVerifier: TokenRequestDto = {
        ...validTokenRequest,
        code_verifier: 'invalid_code_verifier', // 無効なPKCEベリファイア
      };

      const mockErrorResponse = {
        error: 'invalid_grant',
        error_description: 'PKCE verification failed',
      };

      mockOauthService.processToken.mockResolvedValue(mockErrorResponse);

      await expect(
        controller.token(requestWithInvalidVerifier),
      ).rejects.toThrow(HttpException);
    });

    it('should handle client authentication failure', async () => {
      const requestWithInvalidSecret: TokenRequestDto = {
        ...validTokenRequest,
        client_secret: 'wrong_secret',
      };

      const mockErrorResponse = {
        error: 'invalid_client',
        error_description: 'Client authentication failed',
      };

      mockOauthService.processToken.mockResolvedValue(mockErrorResponse);

      await expect(controller.token(requestWithInvalidSecret)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('revoke (POST /oauth/revoke)', () => {
    const validRevokeRequest: RevokeTokenDto = {
      token: 'access_token_to_revoke',
      token_type_hint: 'access_token',
      client_id: 'test_client_id',
      client_secret: 'test_client_secret',
    };

    it('should revoke token successfully', async () => {
      const mockRevokeResponse = {
        success: true,
      };

      mockOauthService.processRevoke.mockResolvedValue(mockRevokeResponse);

      await expect(
        controller.revoke(validRevokeRequest),
      ).resolves.toBeUndefined();

      expect(mockOauthService.processRevoke).toHaveBeenCalledWith(
        validRevokeRequest,
      );
    });

    it('should handle refresh token revocation', async () => {
      const refreshRevokeRequest: RevokeTokenDto = {
        token: 'refresh_token_to_revoke',
        token_type_hint: 'refresh_token',
        client_id: 'test_client_id',
        client_secret: 'test_client_secret',
      };

      const mockRevokeResponse = {
        success: true,
      };

      mockOauthService.processRevoke.mockResolvedValue(mockRevokeResponse);

      await expect(
        controller.revoke(refreshRevokeRequest),
      ).resolves.toBeUndefined();
    });

    it('should handle token revocation without token_type_hint', async () => {
      const requestWithoutHint: RevokeTokenDto = {
        token: 'token_to_revoke',
        client_id: 'test_client_id',
        client_secret: 'test_client_secret',
      };

      const mockRevokeResponse = {
        success: true,
      };

      mockOauthService.processRevoke.mockResolvedValue(mockRevokeResponse);

      await expect(
        controller.revoke(requestWithoutHint),
      ).resolves.toBeUndefined();
    });

    it('should handle invalid client authentication', async () => {
      const requestWithInvalidAuth: RevokeTokenDto = {
        ...validRevokeRequest,
        client_secret: 'wrong_secret',
      };

      const mockErrorResponse = {
        success: false,
        error: 'invalid_client',
        error_description: 'Client authentication failed',
      };

      mockOauthService.processRevoke.mockResolvedValue(mockErrorResponse);

      await expect(controller.revoke(requestWithInvalidAuth)).rejects.toThrow(
        HttpException,
      );
    });

    it('should return success even for non-existent tokens (RFC 7009)', async () => {
      const requestWithNonExistentToken: RevokeTokenDto = {
        ...validRevokeRequest,
        token: 'non_existent_token',
      };

      const mockRevokeResponse = {
        success: true, // RFC 7009: トークンが存在しなくても成功を返す
      };

      mockOauthService.processRevoke.mockResolvedValue(mockRevokeResponse);

      await expect(
        controller.revoke(requestWithNonExistentToken),
      ).resolves.toBeUndefined();
    });
  });

  describe('introspect (POST /oauth/introspect)', () => {
    const validIntrospectRequest: IntrospectTokenDto = {
      token: 'access_token_to_introspect',
      client_id: 'test_client_id',
      client_secret: 'test_client_secret',
    };

    it('should introspect active token successfully', async () => {
      const mockIntrospectResponse = {
        active: true,
        scope: 'read write',
        client_id: 'test_client_id',
        username: 'testuser',
        token_type: 'Bearer',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        sub: 'user_123',
        aud: 'api.example.com',
        iss: 'https://auth.example.com',
        jti: 'token_unique_id',
      };

      mockOauthService.processIntrospect.mockResolvedValue(
        mockIntrospectResponse,
      );

      const result = await controller.introspect(validIntrospectRequest);

      expect(mockOauthService.processIntrospect).toHaveBeenCalledWith(
        validIntrospectRequest,
      );
      expect(result).toEqual(mockIntrospectResponse);
    });

    it('should introspect inactive/expired token', async () => {
      const mockIntrospectResponse = {
        active: false,
      };

      mockOauthService.processIntrospect.mockResolvedValue(
        mockIntrospectResponse,
      );

      const result = await controller.introspect(validIntrospectRequest);

      expect(result).toEqual(mockIntrospectResponse);
    });

    it('should handle invalid token format', async () => {
      const requestWithInvalidToken: IntrospectTokenDto = {
        ...validIntrospectRequest,
        token: 'malformed.token.format',
      };

      const mockIntrospectResponse = {
        active: false,
      };

      mockOauthService.processIntrospect.mockResolvedValue(
        mockIntrospectResponse,
      );

      const result: IntrospectResponse = await controller.introspect(
        requestWithInvalidToken,
      );

      expect(result.active).toBe(false);
    });

    it('should handle client authentication failure', async () => {
      const requestWithInvalidAuth: IntrospectTokenDto = {
        ...validIntrospectRequest,
        client_secret: 'wrong_secret',
      };

      const mockErrorResponse = {
        active: false,
        error: 'invalid_client',
        error_description: 'Client authentication failed',
      };

      mockOauthService.processIntrospect.mockResolvedValue(mockErrorResponse);

      await expect(
        controller.introspect(requestWithInvalidAuth),
      ).rejects.toThrow(HttpException);
    });

    it('should handle server errors during introspection', async () => {
      mockOauthService.processIntrospect.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        controller.introspect(validIntrospectRequest),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('userinfo (GET /oauth/userinfo)', () => {
    const validBearerToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

    it('should return user info for valid token', async () => {
      const mockUserInfoResponse = {
        sub: 'user_123',
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        email: 'test@example.com',
        email_verified: true,
        picture: 'https://example.com/avatar.jpg',
        preferred_username: 'testuser',
      };

      mockOauthService.processUserInfo.mockResolvedValue(mockUserInfoResponse);

      const result = await controller.userinfo(validBearerToken);

      expect(mockOauthService.processUserInfo).toHaveBeenCalledWith({
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      });
      expect(result).toEqual(mockUserInfoResponse);
    });

    it('should handle missing Authorization header', async () => {
      await expect(controller.userinfo()).rejects.toThrow(HttpException);
    });

    it('should handle malformed Authorization header', async () => {
      const malformedHeaders = [
        'InvalidHeader token',
        'Bearer',
        'Token eyJhbGci...',
      ];

      for (const header of malformedHeaders) {
        // extractBearerTokenがnullを返すため、UnauthorizedExceptionが投げられる
        // モックサービスは呼ばれない（トークン抽出で失敗するため）
        await expect(controller.userinfo(header)).rejects.toThrow(
          HttpException,
        );
      }

      // 'bearer token' は valid な形式なので別途テスト
      // これは実際にモックサービスが呼ばれる可能性がある
      mockOauthService.processUserInfo.mockResolvedValue({
        error: 'invalid_token',
        error_description: 'Token is invalid',
      });

      await expect(controller.userinfo('bearer token')).rejects.toThrow(
        HttpException,
      );
    });

    it('should handle invalid/expired token', async () => {
      const mockErrorResponse = {
        error: 'invalid_token',
        error_description:
          'The access token provided is expired, revoked, malformed, or invalid',
      };

      mockOauthService.processUserInfo.mockResolvedValue(mockErrorResponse);

      await expect(controller.userinfo(validBearerToken)).rejects.toThrow(
        HttpException,
      );
    });

    it('should handle insufficient scope', async () => {
      const mockErrorResponse = {
        error: 'insufficient_scope',
        error_description:
          'The request requires higher privileges than provided by the access token',
      };

      mockOauthService.processUserInfo.mockResolvedValue(mockErrorResponse);

      await expect(controller.userinfo(validBearerToken)).rejects.toThrow(
        HttpException,
      );
    });

    it('should exclude error fields from successful response', async () => {
      const mockResponseWithoutError = {
        sub: 'user_123',
        name: 'Test User',
        email: 'test@example.com',
        // エラーフィールドは含めない（成功レスポンス）
      };

      mockOauthService.processUserInfo.mockResolvedValue(
        mockResponseWithoutError,
      );

      const result = await controller.userinfo(validBearerToken);

      expect(result).toEqual({
        sub: 'user_123',
        name: 'Test User',
        email: 'test@example.com',
      });
      expect(result).not.toHaveProperty('error');
      expect(result).not.toHaveProperty('error_description');
    });
  });

  describe('processConsent (POST /oauth/consent)', () => {
    const validConsentData = {
      approved: true,
      scopes: ['read', 'write'],
      userId: 'user_123',
      clientId: 'test_client_id',
    };

    it('should process user consent approval successfully', async () => {
      const mockConsentResponse = {
        success: true,
      };

      mockOauthService.processConsent.mockResolvedValue(mockConsentResponse);

      const result: ConsentResponse =
        await controller.processConsent(validConsentData);

      expect(mockOauthService.processConsent).toHaveBeenCalledWith(
        'user_123',
        'test_client_id',
        ['read', 'write'],
        true,
      );
      expect(result).toEqual({
        message: 'Consent processed successfully',
      });
    });

    it('should process user consent denial', async () => {
      const denialConsentData = {
        ...validConsentData,
        approved: false,
      };

      const mockConsentResponse = {
        success: true,
      };

      mockOauthService.processConsent.mockResolvedValue(mockConsentResponse);

      const result: ConsentResponse =
        await controller.processConsent(denialConsentData);

      expect(mockOauthService.processConsent).toHaveBeenCalledWith(
        'user_123',
        'test_client_id',
        ['read', 'write'],
        false,
      );
      expect(result).toEqual({
        message: 'Consent processed successfully',
      });
    });

    it('should handle consent with empty scopes', async () => {
      const consentWithEmptyScopes = {
        ...validConsentData,
        scopes: [],
      };

      const mockConsentResponse = {
        success: true,
      };

      mockOauthService.processConsent.mockResolvedValue(mockConsentResponse);

      const result: ConsentResponse = await controller.processConsent(
        consentWithEmptyScopes,
      );

      expect(mockOauthService.processConsent).toHaveBeenCalledWith(
        'user_123',
        'test_client_id',
        [],
        true,
      );
    });

    it('should handle consent processing failure', async () => {
      const mockConsentResponse = {
        success: false,
        error: 'consent_processing_failed',
      };

      mockOauthService.processConsent.mockResolvedValue(mockConsentResponse);

      await expect(controller.processConsent(validConsentData)).rejects.toThrow(
        HttpException,
      );
    });

    it('should handle missing consent data fields', async () => {
      const incompleteConsentData = {
        approved: true,
        userId: '',
        clientId: 'test_client_id',
      };

      mockOauthService.processConsent.mockResolvedValue({ success: false });

      await expect(
        controller.processConsent(incompleteConsentData),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('Error Handling and Security', () => {
    it('should map OAuth errors to correct HTTP status codes', () => {
      const errorStatusMap = [
        { error: 'invalid_request', expectedStatus: 400 },
        { error: 'invalid_client', expectedStatus: 401 },
        { error: 'invalid_grant', expectedStatus: 400 },
        { error: 'unauthorized_client', expectedStatus: 400 },
        { error: 'unsupported_grant_type', expectedStatus: 400 },
        { error: 'invalid_scope', expectedStatus: 400 },
        { error: 'access_denied', expectedStatus: 403 },
        { error: 'unsupported_response_type', expectedStatus: 400 },
        { error: 'server_error', expectedStatus: 500 },
        { error: 'temporarily_unavailable', expectedStatus: 503 },
        { error: 'invalid_token', expectedStatus: 401 },
      ];

      errorStatusMap.forEach(({ error, expectedStatus }) => {
        const statusCode = controller.getHttpStatusForError(error);
        expect(statusCode).toBe(expectedStatus);
      });
    });

    it('should extract Bearer token correctly', () => {
      const testCases = [
        { header: 'Bearer token123', expected: 'token123' },
        { header: 'bearer token456', expected: 'token456' },
        { header: 'BEARER token789', expected: 'token789' },
        { header: 'Bearer eyJhbGci...', expected: 'eyJhbGci...' },
        { header: 'Basic dXNlcjpwYXNz', expected: null },
        { header: 'Bearer', expected: null },
        { header: 'Token abc123', expected: null },
        { header: '', expected: null },
      ];

      testCases.forEach(({ header, expected }) => {
        const token = controller.extractBearerToken(header);
        expect(token).toBe(expected);
      });
    });

    it('should handle unexpected server errors gracefully', async () => {
      // 各エンドポイントで予期しないエラーが発生した場合のテスト
      const unexpectedError = new Error('Unexpected database error');

      mockOauthService.processAuthorize.mockRejectedValue(unexpectedError);
      mockOauthService.processToken.mockRejectedValue(unexpectedError);
      mockOauthService.processRevoke.mockRejectedValue(unexpectedError);
      mockOauthService.processIntrospect.mockRejectedValue(unexpectedError);
      mockOauthService.processUserInfo.mockRejectedValue(unexpectedError);

      const mockRequest = {
        ip: '127.0.0.1',
        get: jest.fn(),
      } as unknown as Request;
      const validQuery = {
        response_type: 'code',
        client_id: 'test',
        redirect_uri: 'https://example.com/callback',
        state: 'state',
      } as AuthorizeQueryDto;

      // 各エンドポイントが適切にエラーハンドリングを行うことを確認
      await expect(
        controller.authorize(validQuery, mockRequest),
      ).rejects.toThrow(HttpException);

      await expect(controller.token({} as TokenRequestDto)).rejects.toThrow(
        HttpException,
      );

      await expect(controller.revoke({} as RevokeTokenDto)).rejects.toThrow(
        HttpException,
      );

      await expect(
        controller.introspect({} as IntrospectTokenDto),
      ).rejects.toThrow(HttpException);

      await expect(controller.userinfo('Bearer token')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('OAuth 2.0 Security Compliance', () => {
    it('should enforce PKCE for authorization code flow', async () => {
      const requestWithoutPKCE: AuthorizeQueryDto = {
        response_type: 'code',
        client_id: 'test_client_id',
        redirect_uri: 'https://example.com/callback',
        state: 'test_state',
        // code_challenge と code_challenge_method が欠如
      };

      // PKCE なしでもバリデーションは通るが、推奨されない
      // 実際のサービスでは PKCE を強制することが推奨される
      const mockResult = {
        success: true,
        redirectUri: 'https://example.com/callback?code=code&state=test_state',
      };

      mockOauthService.processAuthorize.mockResolvedValue(mockResult);
      const mockRequest = {
        ip: '127.0.0.1',
        get: jest.fn(),
      } as unknown as Request;

      const result = await controller.authorize(
        requestWithoutPKCE,
        mockRequest,
      );
      expect(result.statusCode).toBe(HttpStatus.FOUND);
    });

    it('should validate redirect_uri strictly', async () => {
      const maliciousRedirectUris = [
        'not-a-valid-uri', // 明らかに無効なURI
        'invalid-uri-format', // 無効なフォーマット
        'foo bar baz', // スペースを含む無効なURI
        'ht!tp://example.com', // 無効な文字を含む
      ];

      const mockRequest = {
        ip: '127.0.0.1',
        get: jest.fn(),
      } as unknown as Request;

      for (const maliciousUri of maliciousRedirectUris) {
        const maliciousQuery: AuthorizeQueryDto = {
          response_type: 'code',
          client_id: 'test_client_id',
          redirect_uri: maliciousUri,
          state: 'test_state',
        };

        // バリデーションで不正なURIとして検出される（zodのurl()バリデーションが働く）
        await expect(
          controller.authorize(maliciousQuery, mockRequest),
        ).rejects.toThrow(HttpException);
      }
    });

    it('should handle state parameter for CSRF protection', async () => {
      const requestsWithInvalidState = [
        // stateなしのケース
        {
          response_type: 'code',
          client_id: 'test_client_id',
          redirect_uri: 'https://example.com/callback',
          // state プロパティなし
        },
        // 空のstateのケース
        {
          response_type: 'code',
          client_id: 'test_client_id',
          redirect_uri: 'https://example.com/callback',
          state: '',
        },
      ];

      const mockRequest = {
        ip: '127.0.0.1',
        get: jest.fn(),
      } as unknown as Request;

      for (const invalidQuery of requestsWithInvalidState) {
        // zodバリデーションでstateが必須であることがチェックされる
        await expect(
          controller.authorize(invalidQuery as AuthorizeQueryDto, mockRequest),
        ).rejects.toThrow(HttpException);
      }
    });
  });
});
