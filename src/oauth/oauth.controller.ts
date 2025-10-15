import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  HttpStatus,
  HttpException,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  HttpCode,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { OauthService } from './oauth.service';
import {
  AuthorizeQueryDto,
  TokenRequestDto,
  RevokeTokenDto,
  IntrospectTokenDto,
} from './dto/create-oauth.dto';
import {
  safeParseAuthorizeQuery,
  safeParseTokenRequest,
  safeParseRevokeToken,
  safeParseIntrospectToken,
} from '../lib/validation/oauth.validation';
import {
  AuthorizeResponse,
  TokenResponse,
  RevokeResponse,
  IntrospectResponse,
  UserInfoResponse,
  ConsentResponse,
} from '../types/oauth-responses.types';
import { NoInterceptor } from '../interceptors/no-interceptor.decorator';

@NoInterceptor()
@Controller('oauth')
export class OauthController {
  constructor(private readonly oauthService: OauthService) {}

  /**
   * OAuth 2.0 認可エンドポイント
   * GET /oauth/authorize
   * フロントチャネル（ブラウザ経由）での認可フロー開始点
   */
  @Get('authorize')
  async authorize(
    @Query() queryParams: AuthorizeQueryDto,
    @Req() req: Request,
  ): Promise<AuthorizeResponse> {
    try {
      // 入力データのバリデーション
      const validationResult = safeParseAuthorizeQuery(queryParams);
      if (!validationResult.success) {
        const errorDetails = validationResult.error?.issues;

        // 常にHttpExceptionを投げる（テストの期待に合わせる）
        throw new BadRequestException({
          error: 'invalid_request',
          error_description: 'Invalid request parameters',
          details: errorDetails,
        });
      }

      // 認可処理
      const result = await this.oauthService.processAuthorize(
        validationResult.data,
        req,
      );

      if (!result.success) {
        // エラーレスポンスの処理
        if (result.redirectUri) {
          // リダイレクトURIが有効な場合はリダイレクト
          return { url: result.redirectUri, statusCode: HttpStatus.FOUND };
        } else {
          // リダイレクトURIが無効または不明な場合は直接エラー
          throw new BadRequestException({
            error: result.error || 'unknown_error',
            error_description:
              result.errorDescription || 'Unknown error occurred',
          });
        }
      }

      // 同意が必要な場合
      if (result.needsConsent) {
        // 実際の実装では同意画面をレンダリング
        return {
          message: 'User consent required',
          consent_info: result.consentInfo,
          // フロントエンドで同意画面を表示するための情報
        };
      }

      // 成功時はクライアントアプリケーションにリダイレクト
      if (result.redirectUri) {
        return { url: result.redirectUri, statusCode: HttpStatus.FOUND };
      }

      // 予期しないケース
      throw new InternalServerErrorException({
        error: 'server_error',
        error_description: 'Unexpected authorization result',
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          error: 'server_error',
          error_description: 'An unexpected error occurred',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * OAuth 2.0 トークンエンドポイント
   * POST /oauth/token
   * バックチャネル（サーバー間通信）でのトークン交換
   */
  @Post('token')
  async token(@Body() tokenRequest: TokenRequestDto): Promise<TokenResponse> {
    try {
      // 入力データのバリデーション
      const validationResult = safeParseTokenRequest(tokenRequest);
      if (!validationResult.success) {
        const errorDetails = validationResult.error?.issues;
        throw new BadRequestException({
          error: 'invalid_request',
          error_description: 'Invalid request parameters',
          details: errorDetails,
        });
      }

      // トークン交換処理
      const result = await this.oauthService.processToken(
        validationResult.data,
      );

      if (result.error) {
        // OAuth 2.0仕様に基づくエラーレスポンス
        const statusCode = this.getHttpStatusForError(result.error);
        throw new HttpException(
          {
            error: result.error,
            error_description: result.error_description,
          },
          statusCode,
        );
      }

      return {
        access_token: result.access_token!,
        token_type: result.token_type || 'Bearer',
        expires_in: result.expires_in!,
        refresh_token: result.refresh_token,
        scope: result.scope,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          error: 'server_error',
          error_description:
            'The authorization server encountered an unexpected condition',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * OAuth 2.0 トークン失効エンドポイント
   * POST /oauth/revoke
   * アクセストークンまたはリフレッシュトークンの無効化
   */
  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  async revoke(@Body() revokeRequest: RevokeTokenDto): Promise<RevokeResponse> {
    try {
      // 入力データのバリデーション
      const validationResult = safeParseRevokeToken(revokeRequest);
      if (!validationResult.success) {
        const errorDetails = validationResult.error?.issues;
        throw new BadRequestException({
          error: 'invalid_request',
          error_description: 'Invalid request parameters',
          details: errorDetails,
        });
      }

      // トークン失効処理
      const result = await this.oauthService.processRevoke(
        validationResult.data,
      );

      if (!result.success && result.error) {
        const statusCode = this.getHttpStatusForError(result.error);
        throw new HttpException(
          {
            error: result.error,
            error_description: result.error_description,
          },
          statusCode,
        );
      }

      // RFC 7009によると、成功時は200 OKを返す（トークンが存在しなくても成功）
      // @HttpCodeデコレータで200を設定済み
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          error: 'server_error',
          error_description:
            'The authorization server encountered an unexpected condition',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * OAuth 2.0 トークン情報エンドポイント
   * POST /oauth/introspect
   * トークンの有効性と情報の確認
   */
  @Post('introspect')
  async introspect(
    @Body() introspectRequest: IntrospectTokenDto,
  ): Promise<IntrospectResponse> {
    try {
      // 入力データのバリデーション
      const validationResult = safeParseIntrospectToken(introspectRequest);
      if (!validationResult.success) {
        const errorDetails = validationResult.error?.issues;
        throw new BadRequestException({
          error: 'invalid_request',
          error_description: 'Invalid request parameters',
          details: errorDetails,
        });
      }

      // トークン情報取得処理
      const result = await this.oauthService.processIntrospect(
        validationResult.data,
      );

      if (result.error) {
        const statusCode = this.getHttpStatusForError(result.error);
        throw new HttpException(
          {
            error: result.error,
            error_description: result.error_description,
          },
          statusCode,
        );
      }

      return {
        active: result.active,
        scope: result.scope,
        client_id: result.client_id,
        username: result.username,
        token_type: result.token_type,
        exp: result.exp,
        iat: result.iat,
        sub: result.sub,
        aud: result.aud,
        iss: result.iss,
        jti: result.jti,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          active: false,
          error: 'server_error',
          error_description:
            'The authorization server encountered an unexpected condition',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * OAuth 2.0 / OpenID Connect ユーザー情報エンドポイント
   * GET /oauth/userinfo
   * アクセストークンを使ってユーザー情報を取得
   */
  @Get('userinfo')
  async userinfo(
    @Headers('authorization') authorization?: string,
  ): Promise<UserInfoResponse> {
    try {
      if (!authorization) {
        throw new UnauthorizedException({
          error: 'invalid_request',
          error_description: 'Missing Authorization header',
        });
      }

      // Bearer トークンの抽出
      const token = this.extractBearerToken(authorization);
      if (!token) {
        throw new UnauthorizedException({
          error: 'invalid_token',
          error_description: 'Invalid or missing bearer token',
        });
      }

      // ユーザー情報取得処理
      const result = await this.oauthService.processUserInfo({
        accessToken: token,
      });

      if (result.error) {
        const statusCode = this.getHttpStatusForError(result.error);
        throw new HttpException(
          {
            error: result.error,
            error_description: result.error_description,
          },
          statusCode,
        );
      }

      // エラーがない場合のみレスポンスを処理
      const { error, error_description, ...userInfo } = result;

      // sub が必須であることを確認
      if (!userInfo.sub) {
        throw new HttpException(
          {
            error: 'server_error',
            error_description: 'Missing required user identifier',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return userInfo as UserInfoResponse;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          error: 'server_error',
          error_description:
            'The authorization server encountered an unexpected condition',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * OAuth 2.0 ユーザー同意処理エンドポイント
   * POST /oauth/consent
   * ユーザーによる同意の処理
   */
  @Post('consent')
  async processConsent(
    @Body()
    consentData: {
      approved: boolean;
      scopes?: string[];
      userId: string;
      clientId: string;
    },
  ): Promise<ConsentResponse> {
    try {
      const result = await this.oauthService.processConsent(
        consentData.userId,
        consentData.clientId,
        consentData.scopes || [],
        consentData.approved,
      );

      if (!result.success) {
        throw new BadRequestException({
          error: result.error,
          error_description: 'Consent processing failed',
        });
      }

      return {
        message: 'Consent processed successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          error: 'server_error',
          error_description: 'An unexpected error occurred',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Bearer トークンをAuthorizationヘッダーから抽出
   */
  extractBearerToken(authorizationHeader: string): string | null {
    if (!authorizationHeader) {
      return null;
    }

    const matches = authorizationHeader.match(/^Bearer\s+(.+)$/i);
    return matches ? matches[1] : null;
  }

  /**
   * OAuth 2.0エラーに対応するHTTPステータスコードを取得
   */
  getHttpStatusForError(error: string): number {
    const statusMap: Record<string, number> = {
      invalid_request: 400,
      invalid_client: 401,
      invalid_grant: 400,
      unauthorized_client: 400,
      unsupported_grant_type: 400,
      invalid_scope: 400,
      access_denied: 403,
      unsupported_response_type: 400,
      server_error: 500,
      temporarily_unavailable: 503,
      invalid_token: 401,
    };
    return statusMap[error] || 400;
  }
}
