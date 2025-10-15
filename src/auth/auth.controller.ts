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
  UseGuards,
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
import {
  generateJWTToken,
  generateRefreshToken,
  verifyJWTToken,
} from '../lib/auth/jwt-token';
import { findAuthState } from '../lib/database/query';
import type { AuthState, User } from '@prisma/client';
import { ExternalProviderAccessTokenService } from '../encryption/external-provider-access-token/external-provider-access-token.service';
import { OAuthProviderFactory } from '../lib/auth/oauth-provider.factory';
import {
  ProviderNotImplementedError,
  ProviderUnavailableError,
} from '../lib/auth/oauth-provider.interface';
import { AppErrorCode, AppErrorCodes } from '../types/error-codes';
import { NoInterceptor } from '../interceptors/no-interceptor.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthUser } from './decorators/auth-user.decorator';
import type { PublicUser } from './decorators/auth-user.decorator';
import { AuthGoogleUser } from './decorators/auth-google-user.decorator';
import type { GoogleUser } from '../types/google-user';
import { AuthDiscordUser } from './decorators/auth-discord-user.decorator';
import type { DiscordUser } from '../types/discord-user';

@NoInterceptor()
@Controller('auth')
export class AuthController {
  private readonly DEFAULT_CALLBACK_URL = process.env.FRONTEND_CALLBACK_URL!;

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
        throw AppErrorCodes.VALIDATION_FAILED;
      }

      // ユーザー登録処理
      const result = await this.authService.register(validationResult.data);

      if (!result.success) {
        // エラーレスポンスの処理
        if (result.error === 'user_exists') {
          throw AppErrorCodes.USER_EXISTS;
        } else if (result.error === 'weak_password') {
          throw AppErrorCodes.WEAK_PASSWORD;
        } else {
          throw AppErrorCodes.INTERNAL_SERVER_ERROR;
        }
      }

      res.status(HttpStatus.CREATED).json({
        message: 'User registered successfully',
        user: result.user,
      });
    } catch (error) {
      if (error instanceof AppErrorCode) {
        throw error;
      }
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
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
    @Req() req: Request,
  ): Promise<void> {
    try {
      // プロバイダーを取得
      const oauthProvider = this.oauthProviderFactory.getProvider(provider);

      // プロバイダーが利用可能かチェック
      if (!oauthProvider.isAvailable()) {
        throw AppErrorCodes.PROVIDER_UNAVAILABLE;
      }

      // コールバックURLが指定されていない場合はデフォルトを使用
      const finalCallbackUrl = callbackUrl || this.DEFAULT_CALLBACK_URL;

      // APIのベースURLを取得してバックエンドのコールバックURIを構築
      // Use explicit BACKEND_BASE_URL if set, otherwise fall back to BASE_URL or the current request host.
      const baseUrl =
        process.env.BACKEND_BASE_URL ||
        process.env.BASE_URL ||
        `${req.protocol}://${req.headers.host}`;
      const backendRedirectUri = `${baseUrl.replace(/\/$/, '')}/auth/callback/${provider}`;

      // 認証ステートを作成（フロントエンドのコールバックURLを保存）
      const result = await createAuthenticationState(
        {
          provider,
          callbackUrl: finalCallbackUrl,
        },
        oauthProvider,
      );

      if (!result.success) {
        throw AppErrorCodes.INTERNAL_SERVER_ERROR;
      }

      // AuthStateからcode_challengeを取得(X用)
      const authState = await findAuthState(result.stateCode!);
      const codeChallenge = authState?.codeChallenge || undefined;

      // プロバイダーの認証URLを生成(バックエンドのコールバックURIを使用)
      const authUrl = oauthProvider.getAuthorizationUrl(
        backendRedirectUri,
        result.stateCode!,
        codeChallenge,
      );

      // 認証URLにリダイレクト
      res.redirect(authUrl);
    } catch (error) {
      if (error instanceof ProviderNotImplementedError) {
        throw AppErrorCodes.UNSUPPORTED_PROVIDER;
      }
      if (error instanceof ProviderUnavailableError) {
        throw AppErrorCodes.PROVIDER_UNAVAILABLE;
      }
      if (error instanceof AppErrorCode) {
        throw error;
      }
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
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
        throw AppErrorCodes.VALIDATION_FAILED;
      }

      // ログイン処理
      const result = await this.authService.login(validationResult.data);

      if (!result.success) {
        if (result.error === 'invalid_credentials') {
          throw AppErrorCodes.INVALID_CREDENTIALS;
        } else {
          throw AppErrorCodes.INTERNAL_SERVER_ERROR;
        }
      }

      const sessionData = await this.authService.createSession(result.user!.id);
      const tokenResult = await generateJWTToken({
        userId: result.user!.id,
        expirationHours: 1,
      });

      if (!tokenResult.success) {
        throw AppErrorCodes.TOKEN_GENERATION_FAILED;
      }

      const refreshTokenResult = await generateRefreshToken(result.user!.id);
      if (!refreshTokenResult.success) {
        throw AppErrorCodes.TOKEN_GENERATION_FAILED;
      }

      res.status(HttpStatus.OK).json({
        message: 'Login successful',
        jwtId: tokenResult.jwtId,
        access_token: tokenResult.token,
        token_type: 'Bearer',
        expires_in: 60 * 60, // 1時間（秒）
        refresh_token: refreshTokenResult.token,
        refresh_expires_in: 60 * 60 * 24 * 30, // 30日（秒）
        session_id: sessionData.sessionId,
      });
    } catch (error) {
      if (error instanceof AppErrorCode) {
        throw error;
      }
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * リフレッシュトークンでアクセストークンを再発行
   * POST /auth/refresh
   */
  @Post('refresh')
  async refresh(
    @Body() body: { refresh_token?: string },
    @Res() res: Response,
  ): Promise<void> {
    try {
      const refreshToken = body?.refresh_token;
      if (!refreshToken) {
        throw AppErrorCodes.INVALID_REQUEST;
      }

      // リフレッシュトークン検証
      const verify = await verifyJWTToken(refreshToken);
      if (!verify.success || !verify.payload) {
        throw AppErrorCodes.INVALID_TOKEN;
      }

      // 新しいアクセストークンを発行
      const tokenResult = await generateJWTToken({
        userId: verify.payload.sub,
        expirationHours: 1,
      });

      if (!tokenResult.success) {
        throw AppErrorCodes.TOKEN_GENERATION_FAILED;
      }

      res.status(HttpStatus.OK).json({
        message: 'Token refreshed successfully',
        jwtId: tokenResult.jwtId,
        access_token: tokenResult.token,
        token_type: 'Bearer',
        expires_in: 60 * 60, // 1時間（秒）
      });
    } catch (error) {
      if (error instanceof AppErrorCode) {
        throw error;
      }
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * ユーザー情報取得エンドポイント
   * GET /auth/profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(
    @Req() req: Request,
    @Res() res: Response,
    @AuthUser() user: PublicUser,
  ): Promise<void> {
    try {
      // Ensure authenticated user is present
      if (!user || !user.id) {
        throw AppErrorCodes.MISSING_SESSION;
      }

      // セッション検証とユーザー情報取得
      const userProfile = await this.authService.getProfile(user.id);

      if (!userProfile) {
        throw AppErrorCodes.INVALID_SESSION;
      }

      const data = {
        message: 'Profile retrieved successfully',
        user: {
          ...userProfile,
          providers: user.providers,
          roles: user.roles,
        },
      };

      res.status(HttpStatus.OK).json(data);
    } catch (error) {
      if (error instanceof AppErrorCode) {
        throw error;
      }
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
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
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
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
    @Req() req: Request,
  ): Promise<void> {
    try {
      // 入力検証
      if (!authStateDto.provider || !authStateDto.callbackUrl) {
        throw AppErrorCodes.INVALID_REQUEST;
      }

      // プロバイダーを取得
      const oauthProvider = this.oauthProviderFactory.getProvider(
        authStateDto.provider,
      );

      // 認証ステートを作成
      const result = await createAuthenticationState(
        authStateDto,
        oauthProvider,
      );

      if (!result.success) {
        throw AppErrorCodes.INTERNAL_SERVER_ERROR;
      }

      // Use explicit BACKEND_BASE_URL if set, otherwise fall back to BASE_URL or the current request host.
      const baseUrl =
        process.env.BACKEND_BASE_URL! ||
        `${req.protocol}://${req.headers.host}`;
      const backendCallbackUri = `${baseUrl.replace(/\/$/, '')}/auth/callback/${authStateDto.provider}`;

      // AuthStateからcode_challengeを取得(X用)
      const authState = await findAuthState(result.stateCode!);
      const codeChallenge = authState?.codeChallenge || undefined;

      const redirectUrl = oauthProvider.getAuthorizationUrl(
        backendCallbackUri,
        result.stateCode!,
        codeChallenge,
      );

      res.status(HttpStatus.OK).json({
        message: 'Authentication state created successfully',
        state_code: result.stateCode,
        redirect_url: redirectUrl,
      });
    } catch (error) {
      if (error instanceof AppErrorCode) {
        throw error;
      }
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
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
      const baseUrl = process.env.BASE_URL!;
      const redirectUri = `${baseUrl.replace(/\/$/, '')}/auth/callback/${provider}`;

      // code_verifierを取得（X用）
      const codeVerifier = authState.codeVerifier || undefined;

      // プロバイダー経由でOAuth処理を実行 (1行で処理)
      const { snsProfile, accessToken } = await oauthProvider.processOAuth(
        code,
        redirectUri,
        codeVerifier,
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
      if (!verifyTokenDto.stateCode || !verifyTokenDto.oneTimeToken) {
        throw AppErrorCodes.INVALID_REQUEST;
      }

      const tokenResult = await verifyAndCreateToken(verifyTokenDto);

      if (!tokenResult.success) {
        throw AppErrorCodes.INVALID_TOKEN;
      }

      if (!tokenResult.profile?.sub) {
        throw AppErrorCodes.INVALID_TOKEN;
      }
      const sessionData = await this.authService.createSession(
        tokenResult.profile.sub,
      );
      const refreshTokenResult = await generateRefreshToken(
        tokenResult.profile.sub,
      );

      if (!refreshTokenResult.success) {
        throw AppErrorCodes.TOKEN_GENERATION_FAILED.setCustomMesage(
          refreshTokenResult.error?.toString() ?? 'Unknown error',
        );
      }

      res.status(HttpStatus.OK).json({
        message: 'Token verified successfully',
        jwtId: tokenResult.jwtId,
        profile: tokenResult.profile,
        access_token: tokenResult.token,
        refresh_token: refreshTokenResult.token,
        session_id: sessionData.sessionId,
      });
    } catch (error) {
      if (error instanceof AppErrorCode) {
        throw error;
      }
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }
}
