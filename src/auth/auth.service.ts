import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UpdateAuthDto } from './dto/update-auth.dto';
import {
  registerUser,
  loginUser,
  SessionManager,
  validatePasswordStrength,
  validateEmailFormat,
  validateUsernameFormat,
  AuthResponse,
} from '../lib/auth/authentication';
import {
  deleteUser,
  findAllUsers,
  findUserById,
  updateUser,
  findAuthState,
  createJWTState,
  isJWTStateRevoked,
} from '../lib/database/query';
import type {
  RegisterInput,
  LoginInput,
  UserResponse,
} from '../lib/validation/auth.validation';
import { JwtPayload } from './jwt.strategy';
import { AppErrorCodes } from '../types/error-codes';

interface SessionResponse {
  sessionId: string;
  expiresAt: Date;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}
  /**
   * ユーザー登録処理
   */
  async register(registerInput: RegisterInput): Promise<AuthResponse> {
    try {
      // 詳細なバリデーション
      const usernameValidation = validateUsernameFormat(registerInput.username);
      if (!usernameValidation.isValid) {
        return {
          success: false,
          error: 'invalid_request',
          errorDescription: usernameValidation.errors.join(', '),
        };
      }

      if (!validateEmailFormat(registerInput.email)) {
        return {
          success: false,
          error: 'invalid_request',
          errorDescription: 'Invalid email format',
        };
      }

      const passwordValidation = validatePasswordStrength(
        registerInput.password,
      );
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: 'weak_password',
          errorDescription: passwordValidation.errors.join(', '),
        };
      }

      // ユーザー登録実行
      const result = await registerUser({
        username: registerInput.username,
        email: registerInput.email,
        password: registerInput.password,
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'server_error',
        errorDescription: 'An unexpected error occurred during registration',
      };
    }
  }

  /**
   * ユーザーログイン処理
   */
  async login(loginInput: LoginInput): Promise<AuthResponse> {
    try {
      const result = await loginUser({
        usernameOrEmail: loginInput.usernameOrEmail,
        password: loginInput.password,
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'server_error',
        errorDescription: 'An unexpected error occurred during login',
      };
    }
  }

  /**
   * セッション作成
   */
  async createSession(userId: string): Promise<SessionResponse> {
    const sessionId = SessionManager.createSession(userId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間後

    return {
      sessionId,
      expiresAt,
    };
  }

  /**
   * ユーザープロフィール取得
   */
  async getProfile(userId: string): Promise<UserResponse | null> {
    try {
      const user = await findUserById(userId);
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * ログアウト処理
   */
  async logout(sessionId: string): Promise<boolean> {
    try {
      return SessionManager.deleteSession(sessionId);
    } catch (error) {
      return false;
    }
  }

  /**
   * セッションの有効性確認
   */
  async validateSession(sessionId: string): Promise<boolean> {
    try {
      const session = SessionManager.getSession(sessionId);
      return session !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * パスワード強度チェック（公開メソッド）
   */
  validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    return validatePasswordStrength(password);
  }

  /**
   * ユーザー名形式チェック（公開メソッド）
   */
  validateUsername(username: string): {
    isValid: boolean;
    errors: string[];
  } {
    return validateUsernameFormat(username);
  }

  /**
   * メールアドレス形式チェック（公開メソッド）
   */
  validateEmail(email: string): boolean {
    return validateEmailFormat(email);
  }

  /**
   * 期限切れセッションのクリーンアップ
   */
  async cleanupExpiredSessions(): Promise<void> {
    SessionManager.cleanupExpiredSessions();
  }

  /**
   * JWTトークン生成
   */
  async generateJwtToken(user: UserResponse): Promise<TokenResponse> {
    const payload = { sub: user.id, username: user.username };
    const access_token = this.jwtService.sign(payload);
    return {
      access_token,
      expires_in: 24 * 60 * 60, // 24時間
    };
  }

  /**
   * 全てのユーザーを取得（管理者向け）
   */
  async findAll(): Promise<UserResponse[]> {
    try {
      const users = await findAllUsers();
      return users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      }));
    } catch (error) {
      throw AppErrorCodes.USER_GET_DATABASE_ERROR;
    }
  }

  /**
   * 特定のユーザーを取得
   */
  async findOne(id: string): Promise<UserResponse | null> {
    try {
      const user = await findUserById(id);
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      };
    } catch (error) {
      throw AppErrorCodes.USER_GET_DATABASE_ERROR;
    }
  }

  /**
   * ユーザー情報を更新
   */
  async update(
    id: string,
    updateAuthDto: UpdateAuthDto,
  ): Promise<UserResponse | null> {
    try {
      // 入力バリデーション
      const updateData: any = {};

      if (updateAuthDto.username) {
        const usernameValidation = validateUsernameFormat(
          updateAuthDto.username,
        );
        if (!usernameValidation.isValid) {
          throw AppErrorCodes.INVALID_USER_NAME;
        }
        updateData.username = updateAuthDto.username;
      }

      if (updateAuthDto.email) {
        if (!validateEmailFormat(updateAuthDto.email)) {
          throw AppErrorCodes.INVALID_EMAIL_FORMAT;
        }
        updateData.email = updateAuthDto.email;
      }

      if (updateAuthDto.password) {
        const passwordValidation = validatePasswordStrength(
          updateAuthDto.password,
        );
        if (!passwordValidation.isValid) {
          throw AppErrorCodes.WEAK_PASSWORD;
        }
        updateData.password = updateAuthDto.password;
      }

      const updatedUser = await updateUser(id, updateData);

      return {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        created_at: updatedUser.createdAt,
        updated_at: updatedUser.updatedAt,
      };
    } catch (error) {
      throw AppErrorCodes.USER_UPDATE_DATABASE_ERROR;
    }
  }

  /**
   * ユーザーを削除
   */
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    try {
      // ユーザーが存在するかチェック
      const existingUser = await findUserById(id);
      if (!existingUser) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      await deleteUser(id);

      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete user: ${error.message}`,
      };
    }
  }

  /**
   * 認証ステートを取得
   */
  async getAuthState(stateCode: string) {
    try {
      return await findAuthState(stateCode);
    } catch (error) {
      return null;
    }
  }

  /**
   * ユーザーIDでプロフィールを取得
   */
  async getUserProfileById(userId: string): Promise<UserResponse | null> {
    try {
      const user = await findUserById(userId);
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      };
    } catch (error) {
      return null;
    }
  }

  async isJWTStateRevoked(payload: JwtPayload): Promise<boolean> {
    try {
      const revoked = await isJWTStateRevoked(payload.id);
      return revoked;
    } catch (error) {
      return false;
    }
  }
}
