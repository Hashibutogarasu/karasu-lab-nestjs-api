import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { verify, JwtPayload } from 'jsonwebtoken';
import { CreateOauthDto } from './dto/create-oauth.dto';
import { UpdateOauthDto } from './dto/update-oauth.dto';
import {
  createClient,
  findClientById,
  updateClient,
  deleteClient,
  findAllClients,
  generateRandomString,
} from '../lib/database/query';
import {
  AuthorizeRequest,
  AuthorizeResult,
  generateAuthorizationCode,
  processUserConsent,
  buildErrorRedirectUri,
} from '../lib/oauth/authorization';
import {
  TokenRequest,
  TokenResponse,
  processTokenRequest,
} from '../lib/oauth/token';
import {
  RevokeTokenRequest,
  RevokeTokenResponse,
  revokeToken,
} from '../lib/oauth/revocation';
import {
  IntrospectTokenRequest,
  IntrospectTokenResponse,
  introspectToken,
} from '../lib/oauth/introspection';
import {
  UserInfoRequest,
  UserInfoResponse,
  getUserInfo,
  extractBearerToken,
} from '../lib/oauth/userinfo';
import { SecurityAuditLogger, OAuth2ErrorHandler } from '../lib/oauth/utils';
import { SessionManager } from '../lib/auth/authentication';

@Injectable()
export class OauthService {
  /**
   * OAuth 2.0 認可処理
   */
  async processAuthorize(
    request: AuthorizeRequest,
    req: Request,
  ): Promise<AuthorizeResult> {
    try {
      // セキュリティ監査ログ
      SecurityAuditLogger.logSecurityEvent('authorization_attempt', {
        clientId: request.client_id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      // 認証済みユーザーIDを取得（実際の実装では認証ミドルウェアから取得）
      const userId = this.extractUserIdFromSession(req);
      if (!userId) {
        // ユーザーが認証されていない場合はログイン画面にリダイレクト
        return {
          success: false,
          error: 'login_required',
          errorDescription: 'User authentication required',
          redirectUri: this.buildLoginRedirectUri(request),
        };
      }

      // 認可コード生成処理
      const result = await generateAuthorizationCode(request, userId);

      if (result.success) {
        SecurityAuditLogger.logAuthorizationSuccess(
          request.client_id,
          userId,
          request.scope,
        );
      } else {
        SecurityAuditLogger.logAuthorizationFailure(
          request.client_id,
          result.error || 'unknown_error',
          result.errorDescription,
        );
      }

      return result;
    } catch (error) {
      SecurityAuditLogger.logSecurityEvent('authorization_error', {
        clientId: request.client_id,
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: req.ip,
      });

      return {
        success: false,
        error: 'server_error',
        errorDescription: 'An unexpected error occurred during authorization',
      };
    }
  }

  /**
   * OAuth 2.0 トークン交換処理
   */
  async processToken(request: TokenRequest): Promise<TokenResponse> {
    try {
      // セキュリティ監査ログ
      SecurityAuditLogger.logSecurityEvent('token_request', {
        clientId: request.client_id,
        grantType: request.grant_type,
      });

      const result = await processTokenRequest(request);

      if (!result.error) {
        SecurityAuditLogger.logTokenIssued(
          request.client_id,
          result.access_token || 'unknown_user',
          request.grant_type,
        );
      }

      return result;
    } catch (error) {
      SecurityAuditLogger.logSecurityEvent('token_error', {
        clientId: request.client_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        error: 'server_error',
        error_description:
          'An unexpected error occurred during token processing',
      };
    }
  }

  /**
   * OAuth 2.0 トークン失効処理
   */
  async processRevoke(
    request: RevokeTokenRequest,
  ): Promise<RevokeTokenResponse> {
    try {
      // セキュリティ監査ログ
      SecurityAuditLogger.logSecurityEvent('token_revoke_request', {
        clientId: request.client_id,
        tokenTypeHint: request.token_type_hint,
      });

      const result = await revokeToken(request);

      if (result.success) {
        SecurityAuditLogger.logTokenRevoked(
          request.client_id,
          request.token_type_hint || 'unknown',
        );
      }

      return result;
    } catch (error) {
      SecurityAuditLogger.logSecurityEvent('token_revoke_error', {
        clientId: request.client_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: 'server_error',
        error_description:
          'An unexpected error occurred during token revocation',
      };
    }
  }

  /**
   * OAuth 2.0 トークン情報確認処理
   */
  async processIntrospect(
    request: IntrospectTokenRequest,
  ): Promise<IntrospectTokenResponse> {
    try {
      // セキュリティ監査ログ
      SecurityAuditLogger.logSecurityEvent('token_introspect', {
        clientId: request.client_id,
      });

      return await introspectToken(request);
    } catch (error) {
      SecurityAuditLogger.logSecurityEvent('token_introspect_error', {
        clientId: request.client_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        active: false,
        error: 'server_error',
        error_description:
          'An unexpected error occurred during token introspection',
      };
    }
  }

  /**
   * OAuth 2.0 / OpenID Connect ユーザー情報取得処理
   */
  async processUserInfo(request: UserInfoRequest): Promise<UserInfoResponse> {
    try {
      return await getUserInfo(request);
    } catch (error) {
      return {
        error: 'server_error',
        error_description:
          'An unexpected error occurred while retrieving user information',
      };
    }
  }

  /**
   * ユーザー同意処理
   */
  async processConsent(
    userId: string,
    clientId: string,
    grantedScopes: string[],
    approved: boolean,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // セキュリティ監査ログ
      SecurityAuditLogger.logSecurityEvent('user_consent', {
        userId,
        clientId,
        approved,
        scopes: grantedScopes.join(' '),
      });

      return await processUserConsent(
        userId,
        clientId,
        grantedScopes,
        approved,
      );
    } catch (error) {
      SecurityAuditLogger.logSecurityEvent('consent_error', {
        userId,
        clientId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: 'server_error',
      };
    }
  }

  /**
   * エラーレスポンス用リダイレクトURI構築
   */
  buildErrorRedirectUri(
    redirectUri: string,
    error: string,
    errorDescription?: string,
    state?: string,
  ): string {
    return buildErrorRedirectUri(redirectUri, error, errorDescription, state);
  }

  /**
   * セッションからユーザーIDを抽出
   * セッションIDまたはJWTトークンからユーザーIDを取得
   */
  private extractUserIdFromSession(req: Request): string | null {
    // セッションIDまたはJWTトークンからユーザーIDを取得
    const sessionId = req.headers['x-session-id'] as string;
    const authHeader = req.headers['authorization'] as string;

    if (sessionId) {
      // セッションベースの認証
      const session = SessionManager.getSession(sessionId);
      return session?.userId || null;
    }

    if (authHeader) {
      // JWT トークンベースの認証
      const token = extractBearerToken(authHeader);
      if (token) {
        return this.verifyJwtToken(token);
      }
    }

    return null;
  }

  /**
   * JWT トークンを検証してユーザーIDを抽出
   */
  private verifyJwtToken(token: string): string | null {
    try {
      // JWT_SECRET環境変数からシークレットキーを取得
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET environment variable is not set');
      }

      // JWTトークンを検証
      const decoded = verify(token, jwtSecret) as JwtPayload;

      return decoded.sub || null;
    } catch (error) {
      // トークンが無効または期限切れの場合
      SecurityAuditLogger.logSecurityEvent('jwt_verification_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  } /**
   * ログインリダイレクトURIを構築
   */
  private buildLoginRedirectUri(request: AuthorizeRequest): string {
    const loginUrl = new URL('/auth/login', process.env.BASE_URL);

    // 認証後に元のOAuth認可フローに戻るためのパラメータを保存
    loginUrl.searchParams.set('return_to', '/oauth/authorize');
    loginUrl.searchParams.set('client_id', request.client_id);
    loginUrl.searchParams.set('redirect_uri', request.redirect_uri);
    if (request.scope) loginUrl.searchParams.set('scope', request.scope);
    if (request.state) loginUrl.searchParams.set('state', request.state);
    if (request.code_challenge)
      loginUrl.searchParams.set('code_challenge', request.code_challenge);
    if (request.code_challenge_method)
      loginUrl.searchParams.set(
        'code_challenge_method',
        request.code_challenge_method,
      );

    return loginUrl.toString();
  }

  async create(createOauthDto: CreateOauthDto) {
    const clientId = createOauthDto.client_id;
    const secret = generateRandomString(32);
    const name = 'client_' + clientId;
    const redirectUris = [createOauthDto.redirect_uri];
    const grantTypes = ['authorization_code'];
    const scope = createOauthDto.scope;
    return await createClient({
      id: clientId,
      secret,
      name,
      redirectUris,
      grantTypes,
      scope,
    });
  }

  async findAll() {
    return await findAllClients();
  }

  async findOne(id: string) {
    return await findClientById(id);
  }

  async update(id: string, updateOauthDto: UpdateOauthDto) {
    // UpdateOauthDtoをupdateClientのパラメータに変換
    const updateData: Parameters<typeof updateClient>[1] = {};

    if (updateOauthDto.redirect_uri) {
      updateData.redirectUris = [updateOauthDto.redirect_uri];
    }
    if (updateOauthDto.scope !== undefined) {
      updateData.scope = updateOauthDto.scope;
    }
    // 必要に応じて他のフィールドもマッピング

    return await updateClient(id, updateData);
  }

  async remove(id: string) {
    return await deleteClient(id);
  }
}
