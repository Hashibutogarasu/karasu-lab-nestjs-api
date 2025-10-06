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
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/create-auth.dto';
import {
  safeParseRegisterInput,
  safeParseLoginInput,
} from '../lib/validation/auth.validation';
import {
  createAuthenticationState,
  verifyAndCreateToken,
  processSnsCProfile,
  SnsAuthCallback,
} from '../lib/auth/sns-auth';
import { processGoogleOAuth } from '../lib/auth/google-oauth';
import { Google } from '../lib/auth/sns-decorators';
import type { AuthStateDto, VerifyTokenDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  private readonly DEFAULT_CALLBACK_URL =
    process.env.FRONTEND_CALLBACK_URL ||
    'http://localhost:3000/api/auth/signin';
  private readonly DEFAULT_GOOGLE_CALLBACK_URL =
    process.env.FRONTEND_CALLBACK_URL ||
    'http://localhost:3000/api/auth/signin';

  constructor(private readonly authService: AuthService) {}

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
   * Google OAuth認証開始エンドポイント
   * GET /auth/login/google
   */
  @Get('login/google')
  async loginWithGoogle(
    @Query('callback_url') callbackUrl: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // コールバックURLが指定されていない場合はデフォルトを使用
      const finalCallbackUrl = callbackUrl || this.DEFAULT_GOOGLE_CALLBACK_URL;

      // Google認証用のステートコードを作成
      const result = await createAuthenticationState({
        provider: 'google',
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

      // Googleの認証URLにリダイレクト
      res.redirect(result.redirectUrl!);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          error: 'server_error',
          error_description: 'Failed to initiate Google authentication',
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

      // セッション作成（簡単な実装例）
      const sessionData = await this.authService.createSession(result.user!.id);

      // 成功レスポンス
      res.status(HttpStatus.OK).json({
        message: 'Login successful',
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
   * Google認証コールバックエンドポイント
   * GET /auth/callback
   */
  @Get('callback')
  @Google()
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<void> {
    try {
      // エラーレスポンスの処理
      if (error) {
        const errorRedirect = SnsAuthCallback.buildErrorRedirect(
          this.DEFAULT_GOOGLE_CALLBACK_URL,
          error,
        );
        return res.redirect(errorRedirect);
      }

      // パラメータ検証
      if (!code || !state) {
        const errorRedirect = SnsAuthCallback.buildErrorRedirect(
          this.DEFAULT_GOOGLE_CALLBACK_URL,
          'invalid_request',
        );
        return res.redirect(errorRedirect);
      }

      // 認証ステートを取得してコールバックURLを確認
      const authState = await this.authService.getAuthState(state);
      if (!authState) {
        const errorRedirect = SnsAuthCallback.buildErrorRedirect(
          this.DEFAULT_GOOGLE_CALLBACK_URL,
          'invalid_state',
        );
        return res.redirect(errorRedirect);
      }

      // APIのベースURLを取得
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const apiCallbackUrl = `${baseUrl}/auth/callback`;

      // Google OAuth処理
      const redirectUri = apiCallbackUrl;
      const snsProfile = await processGoogleOAuth(code, redirectUri);

      // プロファイル処理
      const processResult = await processSnsCProfile(snsProfile, state);

      if (!processResult.success) {
        const errorType = processResult.error || 'authentication_failed';
        const errorRedirect = SnsAuthCallback.buildErrorRedirect(
          authState.callbackUrl,
          errorType,
        );
        return res.redirect(errorRedirect);
      }

      // フロントエンドのコールバック処理ページにリダイレクト
      const callbackUrl = new URL(
        '/api/auth/callback/karasu-sns',
        process.env.FRONTEND_URL || 'http://localhost:3000',
      );
      callbackUrl.searchParams.set('token', processResult.oneTimeToken!);
      callbackUrl.searchParams.set('state', state);
      callbackUrl.searchParams.set('callbackUrl', authState.callbackUrl);

      return res.redirect(callbackUrl.toString());
    } catch (error) {
      console.error('OAuth callback error:', error);
      const errorRedirect = SnsAuthCallback.buildErrorRedirect(
        this.DEFAULT_GOOGLE_CALLBACK_URL,
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
        profile: result.profile,
        token: result.token,
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
