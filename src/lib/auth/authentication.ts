import { Role } from '@prisma/client';
import { AppErrorCodes } from '../../types/error-codes';
import {
  createUser,
  verifyUserPassword,
  findUserByUsername,
  findUserByEmail,
} from '../database/query';
import { hashString } from '../database/query';
import { z } from 'zod';

/**
 * 認証関連のワークフロー処理
 */

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    roles: Role[];
  };
  error?: string;
  errorDescription?: string;
}

/**
 * ユーザー登録処理
 */
export async function registerUser(
  request: RegisterRequest,
): Promise<AuthResponse> {
  try {
    // 入力検証
    if (!request.username || !request.email || !request.password) {
      return {
        success: false,
        error: 'invalid_request',
        errorDescription: 'Username, email, and password are required.',
      };
    }

    // ユーザー名の重複チェック
    const existingUserByUsername = await findUserByUsername(request.username);
    if (existingUserByUsername) {
      return {
        success: false,
        error: 'user_exists',
        errorDescription: 'Username is already taken.',
      };
    }

    // メールアドレスの重複チェック
    const existingUserByEmail = await findUserByEmail(request.email);
    if (existingUserByEmail) {
      return {
        success: false,
        error: 'user_exists',
        errorDescription: 'Email is already registered.',
      };
    }

    // パスワードの強度チェック（基本的な例）
    if (request.password.length < 8) {
      return {
        success: false,
        error: 'weak_password',
        errorDescription: 'Password must be at least 8 characters long.',
      };
    }

    // ユーザー作成
    const newUser = await createUser({
      username: request.username,
      email: request.email,
      password: request.password,
    });

    return {
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        roles: newUser.roles,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: 'server_error',
      errorDescription: 'An unexpected error occurred during registration.',
    };
  }
}

/**
 * ユーザーログイン処理
 */
export async function loginUser(request: LoginRequest): Promise<AuthResponse> {
  try {
    // 入力検証
    if (!request.usernameOrEmail || !request.password) {
      return {
        success: false,
        error: 'invalid_request',
        errorDescription: 'Username/email and password are required.',
      };
    }

    // ユーザー認証
    const verifiedUser = await verifyUserPassword(
      request.usernameOrEmail,
      request.password,
    );

    if (!verifiedUser) {
      throw AppErrorCodes.INVALID_CREDENTIALS;
    }

    return {
      success: true,
      user: {
        id: verifiedUser.id,
        username: verifiedUser.username,
        email: verifiedUser.email,
        roles: verifiedUser.roles,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: 'server_error',
      errorDescription: 'An unexpected error occurred during login.',
    };
  }
}

/**
 * パスワード強度の検証
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const passwordSchema = z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/[a-z]/, {
      message: 'Password must contain at least one lowercase letter',
    })
    .regex(/[A-Z]/, {
      message: 'Password must contain at least one uppercase letter',
    })
    .regex(/\d/, { message: 'Password must contain at least one number' })
    .regex(/[!@#$%^&*(),.?":{}|<>]/, {
      message: 'Password must contain at least one special character',
    });

  const result = passwordSchema.safeParse(password);
  if (result.success) {
    return { isValid: true, errors: [] };
  } else {
    return {
      isValid: false,
      errors: result.error.issues.map((e) => e.message),
    };
  }
}

/**
 * メールアドレス形式の検証
 */
export function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * ユーザー名形式の検証
 */
export function validateUsernameFormat(username: string): {
  isValid: boolean;
  errors: string[];
} {
  const usernameSchema = z
    .string()
    .min(3, { message: 'Username must be at least 3 characters long' })
    .max(50, { message: 'Username must be no more than 50 characters long' })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message:
        'Username can only contain letters, numbers, underscores, and hyphens',
    });

  const result = usernameSchema.safeParse(username);
  if (result.success) {
    return { isValid: true, errors: [] };
  } else {
    return {
      isValid: false,
      errors: result.error.issues.map((e) => e.message),
    };
  }
}

/**
 * セキュアなセッション管理
 */
export class SessionManager {
  private static sessions = new Map<
    string,
    { userId: string; expiresAt: Date }
  >();

  static createSession(userId: string): string {
    const sessionId = hashString(userId + Date.now() + Math.random());
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間後

    this.sessions.set(sessionId, { userId, expiresAt });
    return sessionId;
  }

  static getSession(sessionId: string): { userId: string } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // 有効期限チェック
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }

    return { userId: session.userId };
  }

  static deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  static cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
      }
    }
  }
}
