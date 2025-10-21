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

@Injectable()
export class JwtTokenService {
  constructor(
    private readonly userService: UserService,
    @Inject(forwardRef(() => JwtstateService))
    private readonly jwtStateService: JwtstateService,
  ) {}

  /**
   * JWTトークンを生成
   */
  async generateJWTToken(
    request: CreateTokenRequest,
  ): Promise<CreateTokenResponse> {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return {
          success: false,
          error: 'server_configuration_error',
          errorDescription: 'JWT secret is not configured',
        };
      }

      // ユーザー情報を取得
      const user = await this.userService.findUserById(request.userId);
      if (!user) {
        return {
          success: false,
          error: 'user_not_found',
          errorDescription: 'User not found',
        };
      }

      // JWT State を作成（既存の ID が指定されていれば再利用）
      let jwtState;
      if (request.jwtStateId) {
        // 再利用先が存在するか確認
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

      // トークンの有効期限を計算
      const expirationHours = request.expirationHours || 1;
      const iat = Math.floor(Date.now() / 1000);
      const exp = iat + expirationHours * 60 * 60;
      const expiresAt = new Date(exp * 1000);

      // JWTペイロードを作成
      const payload: JwtPayload = {
        id: jwtState.id,
        sub: user.id,
        provider: request.provider,
        iat,
        exp,
      };

      // JWTトークンを生成
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
      console.error('JWT token generation error:', error);
      return {
        success: false,
        error: 'server_error',
        errorDescription: 'Failed to generate JWT token',
      };
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
      const decoded = verify(token, jwtSecret) as JWTPayload;

      // JWT State が無効化されていないかチェック
      if (decoded.id) {
        const jwtState = await this.jwtStateService.getJWTStateById(decoded.id);
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

  /**
   * JWTトークンをデコード（検証なし）
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

  /**
   * トークンのメタデータを取得
   */
  getTokenMetadata(token: string): {
    issuedAt?: Date;
    expiresAt?: Date;
    userId?: string;
    jwtId?: string;
    provider?: string;
  } {
    const decoded = this.decodeJWTToken(token);
    if (!decoded) {
      return {};
    }

    return {
      issuedAt: decoded.iat ? new Date(decoded.iat * 1000) : undefined,
      expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : undefined,
      userId: decoded.sub,
      jwtId: decoded.id,
      provider: decoded.provider,
    };
  }
}
