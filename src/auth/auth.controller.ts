import {
  Controller,
  Get,
  Post,
  Body,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  HttpStatus,
  Res,
  Req,
  HttpException,
  Query,
  Param,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/create-auth.dto';
import {
  safeParseRegisterInput,
  safeParseLoginInput,
} from '../lib/validation/auth.validation';
import {
  verifyAndCreateToken,
  processSnsCProfile,
  SnsAuthCallback,
  SnsProfile,
  createAuthenticationState,
} from '../lib/auth/sns-auth';
import type { AuthStateDto, VerifyTokenDto } from './dto/auth.dto';
import { generateJWTToken } from '../lib/auth/jwt-token';
import { AuthState } from '@prisma/client';
import { ExternalProviderAccessTokenService } from '../encryption/external-provider-access-token/external-provider-access-token.service';
import { OAuthProviderFactory } from '../lib/auth/oauth-provider.factory';
import {
  ProviderNotImplementedError,
  ProviderUnavailableError,
} from '../lib/auth/oauth-provider.interface';

@Controller('auth')
export class AuthController {
  private readonly DEFAULT_CALLBACK_URL =
    process.env.FRONTEND_CALLBACK_URL ||
    'http://localhost:3000/api/auth/signin';

  constructor(
    private readonly authService: AuthService,
    private readonly externalProviderAccessTokenService: ExternalProviderAccessTokenService,
    private readonly oauthProviderFactory: OAuthProviderFactory,
  ) {}

  /**
   * ユーザー登録エンドポイント
   * POST /auth/register
   */
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // 入力データのバリデーション
      const validationResult = safeParseRegisterInput(registerDto);
      if (!validationResult.success) {
        const errorDetails = validationResult.error?.issues;
        throw new BadRequestException({
          error: 'invalid_request',
          error_description: 'Validation failed',
          details: errorDetails,
        });
      }

      // ユーザー登録処理
      const result = await this.authService.register(validationResult.data);

      if (!result.success) {
        // エラーレスポンスの処理
        if (result.error === 'user_exists') {
          throw new ConflictException({
            error: result.error,
            error_description: result.errorDescription,
          });
        } else if (result.error === 'weak_password') {
          throw new BadRequestException({
            error: result.error,
            error_description: result.errorDescription,
          });
        } else {
          throw new HttpException(
            {
              error: result.error,
              error_description: result.errorDescription,
            },
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }

      // 成功レスポンス
      res.status(HttpStatus.CREATED).json({
        message: 'User registered successfully',
        user: result.user,
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
   * SNS OAuth認証開始エンドポイント (統合版)
   * GET /auth/login/:provider
   */
  @Get('login/:provider')
  async loginWithProvider(
    @Param('provider') provider: string,
    @Query('callback_url') callbackUrl: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // プロバイダーを取得
      const oauthProvider = this.oauthProviderFactory.getProvider(provider);

      // プロバイダーが利用可能かチェック
      if (!oauthProvider.isAvailable()) {
        throw new ProviderUnavailableError(
          provider,
          'Provider credentials not configured',
        );
      }

      // コールバックURLが指定されていない場合はデフォルトを使用
      const finalCallbackUrl = callbackUrl || this.DEFAULT_CALLBACK_URL;

      // 認証ステートを作成
      const result = await createAuthenticationState({
        provider,
        callbackUrl: finalCallbackUrl,
      });

      if (!result.success) {
        throw new HttpException(
          {
            error: result.error,
            error_description: result.errorDescription,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // APIのベースURLを取得してリダイレクトURIを構築
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const redirectUri = `${baseUrl}/auth/callback/${provider}`;

      // プロバイダーの認証URLを生成
      const authUrl = oauthProvider.getAuthorizationUrl(
        redirectUri,
        result.stateCode!,
      );

      // 認証URLにリダイレクト
      res.redirect(authUrl);
    } catch (error) {
      if (error instanceof ProviderNotImplementedError) {
        throw new BadRequestException({
          error: 'unsupported_provider',
          error_description: error.message,
        });
      }
      if (error instanceof ProviderUnavailableError) {
        throw new HttpException(
          {
            error: 'provider_unavailable',
            error_description: error.message,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          error: 'server_error',
          error_description: `Failed to initiate ${provider} authentication`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * ユーザーログインエンドポイント
   * POST /auth/login
   */
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<void> {
    try {
      // 入力データのバリデーション
      const validationResult = safeParseLoginInput(loginDto);
      if (!validationResult.success) {
        const errorDetails = validationResult.error?.issues || [];
        throw new BadRequestException({
          error: 'invalid_request',
          error_description: 'Validation failed',
          details: errorDetails,
        });
      }

      // ログイン処理
      const result = await this.authService.login(validationResult.data);

      if (!result.success) {
        if (result.error === 'invalid_credentials') {
          throw new UnauthorizedException({
            error: result.error,
            error_description: result.errorDescription,
          });
        } else {
          throw new HttpException(
            {
              error: result.error,
              error_description: result.errorDescription,
            },
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }

      const sessionData = await this.authService.createSession(result.user!.id);
      const tokenResult = await generateJWTToken({
        userId: result.user!.id,
        expirationHours: 1,
      });

      if (!tokenResult.success) {
        throw new HttpException(
          {
            error: tokenResult.error || 'token_generation_failed',
            error_description:
              tokenResult.errorDescription || 'Failed to generate JWT token',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // 成功レスポンス
      res.status(HttpStatus.OK).json({
        message: 'Login successful',
        jwtId: tokenResult.jwtId,
        // token: tokenResult.token,
        user: result.user,
        session_id: sessionData.sessionId,
        expires_at: sessionData.expiresAt,
      });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
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
   * ユーザー情報取得エンドポイント
   * GET /auth/profile
   */
  @Get('profile')
  async getProfile(@Req() req: Request, @Res() res: Response): Promise<void> {
    try {
      // セッションIDを取得（大文字小文字を区別しない）
      const sessionId = (req.headers['x-session-id'] ||
        req.headers['X-Session-ID'] ||
        req.headers['X-Session-Id']) as string;
      if (!sessionId || sessionId.trim() === '') {
        throw new UnauthorizedException({
          error: 'missing_session',
          error_description: 'Session ID is required',
        });
      }

      // セッション検証とユーザー情報取得
      const userProfile = await this.authService.getProfile(sessionId);

      if (!userProfile) {
        throw new UnauthorizedException({
          error: 'invalid_session',
          error_description: 'Invalid or expired session',
        });
      }

      // 成功レスポンス
      res.status(HttpStatus.OK).json({
        message: 'Profile retrieved successfully',
        user: userProfile,
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
   * ユーザーログアウトエンドポイント
   * POST /auth/logout
   */
  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    try {
      const sessionId = (req.headers['x-session-id'] ||
        req.headers['X-Session-ID'] ||
        req.headers['X-Session-Id']) as string;
      if (sessionId && sessionId.trim() !== '') {
        await this.authService.logout(sessionId);
      }

      res.status(HttpStatus.OK).json({
        message: 'Logout successful',
      });
    } catch (error) {
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
   * SNS認証ステート作成エンドポイント
   * POST /auth/state
   */
  @Post('state')
  async createAuthState(
    @Body() authStateDto: AuthStateDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // 入力検証
      if (!authStateDto.provider || !authStateDto.callbackUrl) {
        throw new BadRequestException({
          error: 'invalid_request',
          error_description: 'Provider and callbackUrl are required',
        });
      }

      // 認証ステートを作成
      const result = await createAuthenticationState(authStateDto);

      if (!result.success) {
        throw new HttpException(
          {
            error: result.error,
            error_description: result.errorDescription,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      res.status(HttpStatus.OK).json({
        message: 'Authentication state created successfully',
        state_code: result.stateCode,
        redirect_url: result.redirectUrl,
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
   * SNS認証コールバックエンドポイント (統合版)
   * GET /auth/callback/:provider
   */
  @Get('callback/:provider')
  async handleProviderCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('callbackUrl') queryCallbackUrl: string,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<void> {
    let authState: AuthState | null = null;
    try {
      // 認証ステートを取得してプロバイダーを確認
      authState = await this.authService.getAuthState(state);
      const defaultCallbackUrl =
        authState?.callbackUrl || this.DEFAULT_CALLBACK_URL;

      // エラーレスポンスの処理
      if (error) {
        const finalCallbackUrl = queryCallbackUrl || defaultCallbackUrl;
        const errorRedirect = SnsAuthCallback.buildErrorRedirect(
          finalCallbackUrl,
          error,
        );
        return res.redirect(errorRedirect);
      }

      // パラメータ検証
      if (!code || !state) {
        const finalCallbackUrl = queryCallbackUrl || defaultCallbackUrl;
        const errorRedirect = SnsAuthCallback.buildErrorRedirect(
          finalCallbackUrl,
          'invalid_request',
        );
        return res.redirect(errorRedirect);
      }

      if (!authState) {
        const finalCallbackUrl = queryCallbackUrl || this.DEFAULT_CALLBACK_URL;
        const errorRedirect = SnsAuthCallback.buildErrorRedirect(
          finalCallbackUrl,
          'invalid_state',
        );
        return res.redirect(errorRedirect);
      }

      // プロバイダーが一致するかチェック
      if (authState.provider !== provider) {
        const finalCallbackUrl = queryCallbackUrl || authState.callbackUrl;
        const errorRedirect = SnsAuthCallback.buildErrorRedirect(
          finalCallbackUrl,
          'provider_mismatch',
        );
        return res.redirect(errorRedirect);
      }

      // プロバイダーを取得
      const oauthProvider = this.oauthProviderFactory.getProvider(provider);

      // APIのベースURLを取得してリダイレクトURIを構築
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const redirectUri = `${baseUrl}/auth/callback/${provider}`;

      // プロバイダー経由でOAuth処理を実行 (1行で処理)
      const { snsProfile, accessToken } = await oauthProvider.processOAuth(
        code,
        redirectUri,
      );

      // プロファイル処理
      const processResult = await processSnsCProfile(snsProfile, state);

      if (accessToken) {
        // アクセストークンを暗号化してデータベースに保存または更新
        await this.externalProviderAccessTokenService.upsert(
          {
            userId: processResult.userId,
            provider: authState.provider,
          },
          {
            provider: authState.provider,
            token: accessToken,
            userId: processResult.userId!,
          },
        );
      }

      if (!processResult.success) {
        const errorType = processResult.error || 'authentication_failed';
        const finalCallbackUrl = queryCallbackUrl || authState.callbackUrl;
        const errorRedirect = SnsAuthCallback.buildErrorRedirect(
          finalCallbackUrl,
          errorType,
        );
        return res.redirect(errorRedirect);
      }

      // フロントエンドが指定したコールバックURLに最終的にリダイレクト
      const finalCallbackUrl = queryCallbackUrl || authState.callbackUrl;
      const callbackUrl = new URL(finalCallbackUrl);
      callbackUrl.searchParams.set('token', processResult.oneTimeToken!);
      callbackUrl.searchParams.set('state', state);
      callbackUrl.searchParams.set('success', 'true');

      return res.redirect(callbackUrl.toString());
    } catch (error) {
      console.error('OAuth callback error:', error);
      const fallbackUrl =
        queryCallbackUrl || authState?.callbackUrl || this.DEFAULT_CALLBACK_URL;
      const errorRedirect = SnsAuthCallback.buildErrorRedirect(
        fallbackUrl,
        'server_error',
      );
      res.redirect(errorRedirect);
    }
  }

  /**
   * SNS認証トークン検証エンドポイント
   * POST /auth/verify
   */
  @Post('verify')
  async verifyToken(
    @Body() verifyTokenDto: VerifyTokenDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // 入力検証
      if (!verifyTokenDto.stateCode || !verifyTokenDto.oneTimeToken) {
        throw new BadRequestException({
          error: 'invalid_request',
          error_description: 'State code and one-time token are required',
        });
      }

      // トークンを検証してJWTを発行
      const result = await verifyAndCreateToken(verifyTokenDto);

      if (!result.success) {
        if (result.error === 'invalid_token') {
          throw new UnauthorizedException({
            error: result.error,
            error_description: result.errorDescription,
          });
        } else {
          throw new HttpException(
            {
              error: result.error,
              error_description: result.errorDescription,
            },
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }

      res.status(HttpStatus.OK).json({
        message: 'Token verified successfully',
        jwtId: result.jwtId,
        profile: result.profile,
        token: result.token,
        role: result.user?.role,
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
}
