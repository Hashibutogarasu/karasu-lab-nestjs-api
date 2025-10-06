import {
  createUser,
  verifyUserPassword,
  findUserByUsername,
  findUserByEmail,
} from '../database/query';
import { hashString } from '../database/query';

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
    role: string;
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
        role: newUser.role,
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
    const authResult = await verifyUserPassword(
      request.usernameOrEmail,
      request.password,
    );

    if (!authResult.isValid || !authResult.user) {
      return {
        success: false,
        error: 'invalid_credentials',
        errorDescription: 'Invalid username/email or password.',
      };
    }

    return {
      success: true,
      user: {
        id: authResult.user.id,
        username: authResult.user.username,
        email: authResult.user.email,
        role: authResult.user.role,
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
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
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
  const errors: string[] = [];

  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }

  if (username.length > 50) {
    errors.push('Username must be no more than 50 characters long');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push(
      'Username can only contain letters, numbers, underscores, and hyphens',
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * セキュアなセッション管理（シンプルな実装例）
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
