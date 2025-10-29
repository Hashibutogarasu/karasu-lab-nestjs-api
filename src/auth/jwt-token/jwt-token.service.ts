import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { CreateTokenRequest, CreateTokenResponse } from '../../lib';
import { decode, JwtPayload, sign, verify } from 'jsonwebtoken';
import { UserService } from '../../data-base/query/user/user.service';
import { JwtstateService } from '../../data-base/query/jwtstate/jwtstate.service';
import { BaseService } from '../../impl/base-service';
import { AppConfigService } from '../../app-config/app-config.service';
import { EncryptionService } from '../../encryption/encryption.service';
import { JWTState } from '@prisma/client';
import { AppErrorCodes } from '../../types/error-codes';
import { CommonJWTPayload } from '../../oauth/oauth.dto';
import { VerifyTokenResponse } from './jwt-token.dto';

@Injectable()
export class JwtTokenService extends BaseService {
  constructor(
    private readonly userService: UserService,
    @Inject(forwardRef(() => JwtstateService))
    private readonly jwtStateService: JwtstateService,
    private readonly encryptionService: EncryptionService,
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
      const privateKeyPem = this.encryptionService.getPrivateKeyPem();
      if (!privateKeyPem) {
        throw AppErrorCodes.INTERNAL_SERVER_ERROR;
      }

      const user = await this.userService.findUserById(request.userId);
      if (!user) {
        throw AppErrorCodes.USER_NOT_FOUND;
      }

      let jwtState: JWTState;

      const expirationHours = request.expirationHours || 1;
      const iat = Math.floor(Date.now() / 1000);
      const exp = iat + expirationHours * 60 * 60;

      if (request.jwtStateId) {
        const existing = await this.jwtStateService.getJWTStateById(
          request.jwtStateId,
        );
        if (!existing) {
          throw AppErrorCodes.JWT_STATE_NOT_FOUND;
        }

        jwtState = existing;
      } else {
        jwtState = await this.jwtStateService.createJWTState(user.id, iat, exp);
      }

      const expiresAt = jwtState.expiresAt;

      if (!expiresAt) {
        throw AppErrorCodes.INVALID_EXPIRES_AT_OPTION;
      }

      const payload: JwtPayload = {
        id: jwtState.id,
        sub: user.id,
        provider: request.provider,
        iat,
        exp,
      };
      const token = sign(payload, privateKeyPem, { algorithm: 'RS256' });

      try {
        const refreshExpirationHours = 24 * 30; // default 30 days

        const refreshIat = iat;
        const refreshExp = refreshIat + refreshExpirationHours * 60 * 60;

        const refreshState = await this.jwtStateService.createJWTState(
          user.id,
          refreshIat,
          refreshExp,
        );

        const refreshPayload: JwtPayload = {
          id: refreshState.id,
          sub: user.id,
          iat: refreshIat,
          exp: refreshExp,
        };

        const refreshToken = sign(refreshPayload, privateKeyPem, { algorithm: 'RS256' });

        return {
          success: true,
          jti: jwtState.id,
          accessToken: token,
          refreshToken,
          expiresAt,
          userId: request.userId,
        };
      } catch (err) {
        throw AppErrorCodes.INTERNAL_SERVER_ERROR;
      }
    } catch (error) {
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * JWTトークンを検証・デコード
   */
  async verifyJWTToken(token: string): Promise<VerifyTokenResponse> {
    try {
      // Verify using the RSA public key from EncryptionService (RS256)
      const publicKeyPem = this.encryptionService.getPublicKeyPem();
      if (!publicKeyPem) {
        throw AppErrorCodes.INTERNAL_SERVER_ERROR;
      }

      const decoded = verify(token, publicKeyPem, { algorithms: ['RS256'] }) as JwtPayload;

      // JWT State が無効化されていないかチェック
      if (decoded.jti) {
        const jwtState = await this.jwtStateService.getJWTStateById(
          decoded.jti,
        );
        if (!jwtState || jwtState.revoked) {
          throw AppErrorCodes.TOKEN_GENERATION_FAILED;
        }
      }

      return {
        success: true,
        payload: decoded,
      };
    } catch (error) {
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }

  encodePayload(payload: CommonJWTPayload): string {
    try {
      const privateKeyPem = this.encryptionService.getPrivateKeyPem();
      if (!privateKeyPem) {
        throw AppErrorCodes.INTERNAL_SERVER_ERROR;
      }

      return sign(payload, privateKeyPem, { algorithm: 'RS256' });
    } catch (err) {
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * JWTトークンをデコード
   */
  decodeJWTToken(token: string): JwtPayload | null {
    try {
      const decoded = decode(token) as JwtPayload;
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
}
