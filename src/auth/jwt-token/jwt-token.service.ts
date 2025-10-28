import { Injectable, Inject, forwardRef } from '@nestjs/common';
import {
  CreateTokenRequest,
  CreateTokenResponse,
  JWTPayload,
  VerifyTokenResponse,
} from '../../lib';
import { decode, JwtPayload, sign, verify } from 'jsonwebtoken';
import { UserService } from '../../data-base/query/user/user.service';
import { JwtstateService } from '../../data-base/query/jwtstate/jwtstate.service';
import { BaseService } from '../../impl/base-service';
import { AppConfigService } from '../../app-config/app-config.service';
import { JWTState } from '@prisma/client';
import { AppErrorCodes } from '../../types/error-codes';
import { CommonJWTPayload } from '../../oauth/oauth.dto';

@Injectable()
export class JwtTokenService extends BaseService {
  constructor(
    private readonly userService: UserService,
    @Inject(forwardRef(() => JwtstateService))
    private readonly jwtStateService: JwtstateService,
    configService: AppConfigService,
  ) {
    super(configService);
  }

  /**
   * JWTトークンを生成
   */
  async generateJWTToken(
    request: CreateTokenRequest,
  ): Promise<CreateTokenResponse> {
    try {
      const jwtSecret = this.config.get('jwtSecret');
      if (!jwtSecret) {
        return {
          success: false,
          error: 'server_configuration_error',
          errorDescription: 'JWT secret is not configured',
        };
      }

      const user = await this.userService.findUserById(request.userId);
      if (!user) {
        return {
          success: false,
          error: 'user_not_found',
          errorDescription: 'User not found',
        };
      }

      let jwtState: JWTState;
      if (request.jwtStateId) {
        const existing = await this.jwtStateService.getJWTStateById(
          request.jwtStateId,
        );
        if (!existing) {
          return {
            success: false,
            error: 'invalid_jwt_state',
            errorDescription: 'Provided JWT state does not exist',
          };
        }
        jwtState = existing;
      } else {
        jwtState = await this.jwtStateService.createJWTState(user.id);
      }

      const expirationHours = request.expirationHours || 1;
      const iat = Math.floor(Date.now() / 1000);
      const exp = iat + expirationHours * 60 * 60;
      const expiresAt = new Date(exp * 1000);

      const payload: JwtPayload = {
        id: jwtState.id,
        sub: user.id,
        provider: request.provider,
        iat,
        exp,
      };
      const token = sign(payload, jwtSecret);

      await this.jwtStateService.updateJWTState(jwtState.id, {
        tokenHint: `${token.slice(-8)}`,
      });

      return {
        success: true,
        jwtId: jwtState.id,
        token,
        profile: {
          sub: user.id,
          name: user.username,
          email: user.email,
          provider: request.provider,
          providers: user.providers || [],
        },
        user: {
          roles: user.roles,
        },
        expiresAt,
      };
    } catch (error) {
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * JWTトークンを検証・デコード
   */
  async verifyJWTToken(token: string): Promise<VerifyTokenResponse> {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return {
          success: false,
          error: 'server_configuration_error',
          errorDescription: 'JWT secret is not configured',
        };
      }

      // トークンを検証
      const decoded = verify(token, jwtSecret) as JwtPayload;

      // JWT State が無効化されていないかチェック
      if (decoded.jti) {
        const jwtState = await this.jwtStateService.getJWTStateById(
          decoded.jti,
        );
        if (!jwtState || jwtState.revoked) {
          return {
            success: false,
            error: 'token_revoked',
            errorDescription: 'JWT token has been revoked',
          };
        }
      }

      return {
        success: true,
        payload: decoded,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          return {
            success: false,
            error: 'token_expired',
            errorDescription: 'JWT token has expired',
          };
        } else if (error.name === 'JsonWebTokenError') {
          return {
            success: false,
            error: 'invalid_token',
            errorDescription: 'Invalid JWT token',
          };
        }
      }

      return {
        success: false,
        error: 'verification_error',
        errorDescription: 'Failed to verify JWT token',
      };
    }
  }

  encodePayload(payload: CommonJWTPayload): string {
    const jwtSecret = this.config.get('jwtSecret');
    if (!jwtSecret) {
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
    return sign(payload, jwtSecret);
  }

  /**
   * JWTトークンをデコード
   */
  decodeJWTToken(token: string): JWTPayload | null {
    try {
      const decoded = decode(token) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * トークンの有効期限をチェック
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeJWTToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  }

  /**
   * トークンの残り時間を取得（秒）
   */
  getTokenRemainingTime(token: string): number {
    const decoded = this.decodeJWTToken(token);
    if (!decoded || !decoded.exp) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, decoded.exp - now);
  }

  /**
   * リフレッシュトークンを生成（長期間有効）
   * jwtStateIdがあれば、再利用可能です。
   */
  async generateRefreshToken(
    userId: string,
    options?: { jwtStateId?: string },
  ): Promise<CreateTokenResponse> {
    return this.generateJWTToken({
      userId,
      expirationHours: 24 * 30, // 30日間有効
      jwtStateId: options?.jwtStateId,
    });
  }
}
