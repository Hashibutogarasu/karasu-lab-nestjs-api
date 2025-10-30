import {
  Controller,
  Get,
  Post,
  Body,
  HttpStatus,
  Res,
  Req,
  Query,
  Param,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import type { AuthState } from '@prisma/client';
import { OAuthProviderFactory } from '../lib/auth/oauth-provider.factory';
import {
  IOAuthProvider,
  ProviderNotImplementedError,
  ProviderUnavailableError,
} from '../lib/auth/oauth-provider.interface';
import { AppErrorCode, AppErrorCodes } from '../types/error-codes';
import { NoInterceptor } from '../interceptors/no-interceptor.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthUser } from './decorators/auth-user.decorator';
import { PublicUser } from './decorators/auth-user.decorator';
import { AuthStateService } from '../data-base/query/auth-state/auth-state.service';
import { AuthCoreService } from './sns/auth-core/auth-core.service';
import { MfaService } from '../data-base/query/mfa/mfa.service';
import { ExternalProviderAccessTokenService } from '../data-base/query/external-provider-access-token/external-provider-access-token.service';
import { JwtTokenService } from './jwt-token/jwt-token.service';
import {
  AuthProvidersDto,
  authProvidersSchema,
  AuthStateDto,
  AuthStateResponseDto,
  authStateSchema,
  AuthVerifyResponseDto,
  LinkProviderVerifyDto,
  linkProviderVerifySchema,
  LoginDto,
  LoginResponseDto,
  loginSchema,
  RefreshTokenDto,
  RefreshTokenResponseDto,
  refreshTokenSchema,
  RegisterDto,
  RegisterResponseDto,
  registerSchema,
  VerifyTokenDto,
  verifyTokenSchema,
} from './auth.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';

@NoInterceptor()
@UsePipes(ZodValidationPipe)
@Controller('auth')
export class AuthController {
  private readonly DEFAULT_CALLBACK_URL = process.env.FRONTEND_CALLBACK_URL!;

  constructor(
    private readonly authService: AuthService,
    private readonly externalProviderAccessTokenService: ExternalProviderAccessTokenService,
    private readonly oauthProviderFactory: OAuthProviderFactory,
    private readonly authState: AuthStateService,
    private readonly snsAuthCoreService: AuthCoreService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly mfaService: MfaService,
  ) { }

  private async getCodeChallengeFromState(stateCode?: string) {
    if (!stateCode) return undefined;
    try {
      const authState = await this.authState.findAuthState(stateCode);
      return authState?.codeChallenge || undefined;
    } catch (err) {
      return undefined;
    }
  }

  /**
   * 利用可能な外部プロバイダーリストを返すエンドポイント
   * GET /auth/providers
   */
  @ApiOkResponse({
    type: AuthProvidersDto,
  })
  @ApiInternalServerErrorResponse(
    AppErrorCodes.INTERNAL_SERVER_ERROR.apiResponse,
  )
  @UsePipes(new ZodValidationPipe(authProvidersSchema))
  @Get('providers')
  async getProviders(@Res() res: Response): Promise<void> {
    const available: IOAuthProvider[] = [];

    for (const p of this.oauthProviderFactory.getAllProviders()) {
      try {
        if (p && p.isAvailable()) {
          available.push(p);
        }
      } catch (err) {
        continue;
      }
    }

    res
      .status(HttpStatus.OK)
      .json({ providers: available.map((p) => p.getProvider()) });
  }

  /**
   * ユーザー登録エンドポイント
   * POST /auth/register
   */
  @ApiCreatedResponse({
    type: RegisterResponseDto,
  })
  @ApiBody({ type: RegisterDto })
  @UsePipes(new ZodValidationPipe(registerSchema))
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const { user } = await this.authService.register(registerDto);

      res.status(HttpStatus.CREATED).json({
        message: 'User registered successfully',
        user: user,
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * ユーザーログインエンドポイント
   * POST /auth/login
   */
  @ApiOkResponse({
    type: LoginResponseDto,
  })
  @ApiInternalServerErrorResponse(
    AppErrorCodes.TOKEN_GENERATION_FAILED.apiResponse,
  )
  @ApiInternalServerErrorResponse(
    AppErrorCodes.INTERNAL_SERVER_ERROR.apiResponse,
  )
  @ApiUnauthorizedResponse(AppErrorCodes.INVALID_CREDENTIALS.apiResponse)
  @ApiBody({ type: LoginDto })
  @UsePipes(new ZodValidationPipe(loginSchema))
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<any> {
    try {
      const result = await this.authService.login(loginDto);

      if (!result.success) {
        if (result.error === 'invalid_credentials') {
          throw AppErrorCodes.INVALID_CREDENTIALS;
        } else {
          throw AppErrorCodes.INTERNAL_SERVER_ERROR;
        }
      }

      const tokenResult = await this.jwtTokenService.generateJWTToken({
        userId: result.user!.id,
        expirationHours: 1,
      });

      if (!tokenResult.success) {
        throw AppErrorCodes.TOKEN_GENERATION_FAILED;
      }

      await this.checkForMfa(res, { userId: result.user?.id });

      res.status(HttpStatus.OK).json({
        message: 'Login successful',
        jti: tokenResult.jti,
        access_token: tokenResult.accessToken,
        token_type: 'Bearer',
        expires_in: 60 * 60,
        refresh_token: tokenResult.refreshToken,
        refresh_expires_in: 60 * 60 * 24 * 30,
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
  @ApiOkResponse({
    type: RefreshTokenResponseDto,
  })
  @ApiInternalServerErrorResponse(
    AppErrorCodes.TOKEN_GENERATION_FAILED.apiResponse,
  )
  @ApiBadRequestResponse(AppErrorCodes.INVALID_TOKEN.apiResponse)
  @ApiBadRequestResponse(AppErrorCodes.INVALID_REQUEST.apiResponse)
  @ApiBody({ type: RefreshTokenDto })
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  @Post('refresh')
  async refresh(
    @Body() body: RefreshTokenDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const refreshToken = body?.refresh_token;
      if (!refreshToken) {
        throw AppErrorCodes.INVALID_REQUEST;
      }

      const verify = await this.jwtTokenService.verifyJWTToken(refreshToken);
      if (!verify.success || !verify.payload || !verify.payload.sub) {
        throw AppErrorCodes.INVALID_TOKEN;
      }

      const tokenResult = await this.jwtTokenService.generateJWTToken({
        userId: verify.payload.sub,
        expirationHours: 1,
      });

      if (!tokenResult.success) {
        throw AppErrorCodes.TOKEN_GENERATION_FAILED;
      }

      res.status(HttpStatus.OK).json({
        message: 'Token refreshed successfully',
        jwtId: tokenResult.jti,
        access_token: tokenResult.accessToken,
        token_type: 'Bearer',
        expires_in: 60 * 60,
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
  @ApiOkResponse({
    type: PublicUser,
  })
  @ApiInternalServerErrorResponse(
    AppErrorCodes.INTERNAL_SERVER_ERROR.apiResponse,
  )
  @ApiBearerAuth()
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(
    @Req() req: Request,
    @Res() res: Response,
    @AuthUser() user: PublicUser,
  ): Promise<void> {
    try {
      const userProfile = await this.authService.getProfile(user.id);

      if (!userProfile) {
        throw AppErrorCodes.INVALID_SESSION;
      }

      const data = {
        message: 'Profile retrieved successfully',
        user: {
          ...userProfile,
          ...user,
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
   * SNS認証ステート作成エンドポイント
   * POST /auth/state
   */
  @ApiOkResponse({
    type: AuthStateResponseDto,
  })
  @ApiBody({ type: AuthStateDto })
  @UsePipes(new ZodValidationPipe(authStateSchema))
  @Post('state')
  async createAuthState(
    @Body() authStateDto: AuthStateDto,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<void> {
    try {
      const oauthProvider = this.oauthProviderFactory.getProvider(
        authStateDto.provider,
      );

      const result = await this.snsAuthCoreService.createAuthenticationState(
        authStateDto,
        oauthProvider,
      );

      if (!result.success) {
        throw AppErrorCodes.INTERNAL_SERVER_ERROR;
      }

      const baseUrl =
        process.env.BASE_URL! || `${req.protocol}://${req.headers.host}`;
      const backendCallbackUri = `${baseUrl.replace(/\/$/, '')}/auth/callback/${authStateDto.provider}`;

      const codeChallenge = await this.getCodeChallengeFromState(
        result.stateCode,
      );

      const redirectUrl = oauthProvider.getAuthorizationUrl(
        backendCallbackUri,
        result.stateCode,
        codeChallenge,
      );

      res.status(HttpStatus.OK).json({
        message: 'Authentication state created successfully',
        code: result.stateCode,
        redirectUrl: redirectUrl,
      });
    } catch (error) {
      if (error instanceof AppErrorCode) {
        throw error;
      }
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * SNS認証コールバックエンドポイント
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
    try {
      const authState = await this.authService.getAuthState(state);

      if (error || !authState) {
        throw AppErrorCodes.INVALID_REQUEST;
      }

      if (!code || !state || !authState || authState.provider !== provider) {
        throw AppErrorCodes.INVALID_REQUEST;
      }

      const oauthProvider = this.oauthProviderFactory.getProvider(provider);
      const baseUrl = process.env.BASE_URL!;
      const redirectUri = `${baseUrl.replace(/\/$/, '')}/auth/callback/${provider}`;

      const codeVerifier = authState.codeVerifier || undefined;
      const { snsProfile, accessToken } = await oauthProvider.processOAuth(
        code,
        redirectUri,
        codeVerifier,
      );

      const processResult = await this.snsAuthCoreService.processSnsProfile(
        snsProfile,
        state,
      );

      if (!processResult || processResult.success === false) {
        throw AppErrorCodes.INTERNAL_SERVER_ERROR;
      }

      if (accessToken && processResult.userId) {
        await this.externalProviderAccessTokenService.upsert(
          {
            userId: processResult.userId,
            provider: authState.provider,
          },
          {
            provider: authState.provider,
            token: accessToken,
            userId: processResult.userId,
          },
        );
      }

      // パスワードをユーザーが外部プロバイダーで初めてリンクするかを検証します。
      const maybeVerifyCode = await this.authService.createExternalProviderLinkVerificationIfNeeded(
        processResult.userId!,
        authState.provider,
        snsProfile,
      );

      const finalCallbackUrl = queryCallbackUrl || authState.callbackUrl;
      const callbackUrl = new URL(finalCallbackUrl);
      if (processResult.oneTimeToken) {
        callbackUrl.searchParams.set('token', processResult.oneTimeToken);
      }
      if (state) {
        callbackUrl.searchParams.set('state', state);
      }

      // 外部プロバイダーの検証のためにパラメーターをセットします。
      if (maybeVerifyCode) {
        callbackUrl.searchParams.set('linkVerifyCode', maybeVerifyCode);
        callbackUrl.searchParams.set('linkProvider', authState.provider);
      }

      return res.redirect(callbackUrl.toString());
    } catch (error) {
      throw error;
    }
  }

  /**
   * SNS認証トークン検証エンドポイント
   * POST /auth/verify
   */
  @ApiOkResponse({
    type: AuthVerifyResponseDto,
  })
  @ApiBody({ type: VerifyTokenDto })
  @UsePipes(new ZodValidationPipe(verifyTokenSchema))
  @Post('verify')
  async verifyToken(
    @Body() verifyTokenDto: VerifyTokenDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      if (!verifyTokenDto.stateCode || !verifyTokenDto.oneTimeToken) {
        throw AppErrorCodes.INVALID_REQUEST;
      }

      const tokenResult =
        await this.snsAuthCoreService.verifyAndCreateToken(verifyTokenDto);

      await this.checkForMfa(res, { userId: tokenResult.userId });

      res.status(HttpStatus.OK).json({
        message: 'Token verified successfully',
        jti: tokenResult.jti,
        access_token: tokenResult.accessToken,
        refresh_token: tokenResult.refreshToken,
      });
    } catch (error) {
      if (error instanceof AppErrorCode) {
        throw error;
      }
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * 外部プロバイダーでログインするときの検証エンドポイントです
   * フロントエンドはJWTで確認コードをポストする必要があります。
   */
  @ApiOkResponse({ type: AuthStateResponseDto })
  @ApiBadRequestResponse(AppErrorCodes.INVALID_REQUEST.apiResponse)
  @ApiUnauthorizedResponse(AppErrorCodes.UNAUTHORIZED.apiResponse)
  @UseGuards(JwtAuthGuard)
  @Post('link/verify')
  @ApiBody({ type: LinkProviderVerifyDto })
  @UsePipes(new ZodValidationPipe(linkProviderVerifySchema))
  async verifyLinkProvider(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { provider, verifyCode } = body;
    if (!provider || !verifyCode) throw AppErrorCodes.INVALID_REQUEST;

    let user: any = null;
    if (req) {
      if (req.user) {
        user = req.user;
      } else if ((req as any).id) {
        user = req;
      }
    }

    if (!user || !user.id) throw AppErrorCodes.UNAUTHORIZED;

    const result = await this.authService.finalizeExternalProviderLinkAfterVerification(
      user.id,
      provider,
      verifyCode,
    );

    return res.status(HttpStatus.OK).json({ message: 'Provider linked', success: true, result });
  }

  async checkForMfa(res: Response, { userId }: { userId?: string }) {
    // Check MFA requirement and if enabled return temporary MFA token instead of full login
    if (!userId) {
      return false;
    }

    const mfaCheck = this.mfaService
      ? await this.mfaService.checkMfaRequired(userId)
      : { mfaRequired: false };
    if (mfaCheck && mfaCheck.mfaRequired) {
      const temp = await this.jwtTokenService.generateJWTToken({
        userId: userId,
        expirationHours: 0.1667, // ~10 minutes
      });
      if (!temp.success) throw AppErrorCodes.TOKEN_GENERATION_FAILED;

      return res.status(HttpStatus.OK).json({
        mfaRequired: true,
        mfaToken: temp.accessToken,
        expiresAt: temp.expiresAt,
      });
    }
  }
}
