/**
 * JWTトークン生成とデコード機能
 */

import { sign, verify, decode, JwtPayload } from 'jsonwebtoken';
import {
  findUserById,
  createJWTState,
  getJWTStateById,
  updateJWTState,
} from '../database/query';
import { Role } from '@prisma/client';

export interface JWTPayload {
  id: string; // JWT State ID
  sub: string; // User ID
  // Keep payload minimal for security
  provider?: string;
  iat?: number;
  exp?: number;
}

export interface CreateTokenRequest {
  userId: string;
  provider?: string;
  expirationHours?: number;
}

export interface CreateTokenResponse {
  success: boolean;
  jwtId?: string;
  token?: string;
  profile?: {
    sub: string;
    name: string;
    email: string;
    provider?: string;
    providers: string[];
  };
  user?: {
    roles: Role[];
  };
  expiresAt?: Date;
  error?: string;
  errorDescription?: string;
}

export interface VerifyTokenResponse {
  success: boolean;
  payload?: JWTPayload;
  error?: string;
  errorDescription?: string;
}

/**
 * JWTトークンを生成
 */
export async function generateJWTToken(
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
    const user = await findUserById(request.userId);
    if (!user) {
      return {
        success: false,
        error: 'user_not_found',
        errorDescription: 'User not found',
      };
    }

    // JWT State を作成
    const jwtState = await createJWTState(user.id);

    // トークンの有効期限を計算
    const expirationHours = request.expirationHours || 1;
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + expirationHours * 60 * 60;
    const expiresAt = new Date(exp * 1000);

    // JWTペイロードを作成
    const payload: JWTPayload = {
      id: jwtState.id,
      sub: user.id,
      provider: request.provider,
      iat,
      exp,
    };

    // JWTトークンを生成
    const token = sign(payload, jwtSecret);

    await updateJWTState(jwtState.id, {
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
export async function verifyJWTToken(
  token: string,
): Promise<VerifyTokenResponse> {
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
    const decoded = verify(token, jwtSecret) as JwtPayload & JWTPayload;

    // JWT State が無効化されていないかチェック
    if (decoded.id) {
      const jwtState = await getJWTStateById(decoded.id);
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
export function decodeJWTToken(token: string): JWTPayload | null {
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
export function isTokenExpired(token: string): boolean {
  const decoded = decodeJWTToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}

/**
 * トークンの残り時間を取得（秒）
 */
export function getTokenRemainingTime(token: string): number {
  const decoded = decodeJWTToken(token);
  if (!decoded || !decoded.exp) {
    return 0;
  }

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, decoded.exp - now);
}

/**
 * リフレッシュトークンを生成（長期間有効）
 */
export async function generateRefreshToken(
  userId: string,
): Promise<CreateTokenResponse> {
  return generateJWTToken({
    userId,
    expirationHours: 24 * 30, // 30日間有効
  });
}

/**
 * トークンのメタデータを取得
 */
export function getTokenMetadata(token: string): {
  issuedAt?: Date;
  expiresAt?: Date;
  userId?: string;
  jwtId?: string;
  provider?: string;
} {
  const decoded = decodeJWTToken(token);
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
