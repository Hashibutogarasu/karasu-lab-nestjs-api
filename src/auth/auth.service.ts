import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthResponse } from '../lib/auth/authentication';
import { WorkflowService } from './sns/workflow/workflow.service';
import { ManagerService } from './session/manager/manager.service';
import { UserService } from '../data-base/query/user/user.service';
import { AuthStateService } from '../data-base/query/auth-state/auth-state.service';
import { JwtstateService } from '../data-base/query/jwtstate/jwtstate.service';
import { JwtPayload } from './jwt.strategy';
import { AppErrorCodes } from '../types/error-codes';
import {
  LoginDto,
  RegisterDto,
  UpdateAuthDto,
  UserResponseDto,
} from './auth.dto';

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
  constructor(
    private jwtService: JwtService,
    private readonly userService: UserService,
    private readonly authStateService: AuthStateService,
    private readonly jwtstateService: JwtstateService,
    private readonly workflowService: WorkflowService,
    private readonly managerService: ManagerService,
  ) {}

  /**
   * ユーザー登録処理
   */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      const existingByUsername = await this.userService.findUserByUsername(
        registerDto.username,
      );
      if (existingByUsername) {
        throw AppErrorCodes.USERNAME_ALREADY_EXISTS;
      }

      const existingByEmail = await this.userService.findUserByEmail(
        registerDto.email,
      );
      if (existingByEmail) {
        throw AppErrorCodes.USER_EXISTS;
      }

      const newUser = await this.userService.createUser({
        username: registerDto.username,
        email: registerDto.email,
        password: registerDto.password,
      });

      return {
        success: true,
        user: newUser,
      };
    } catch (error) {
      throw AppErrorCodes.USER_CREATE_DATABASE_ERROR;
    }
  }

  /**
   * ユーザーログイン処理
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    try {
      const verified = await this.userService.verifyUserPassword(
        loginDto.usernameOrEmail,
        loginDto.password,
      );

      if (!verified) {
        return {
          success: false,
          error: 'invalid_credentials',
          errorDescription: 'Invalid username/email or password',
        };
      }

      return {
        success: true,
        user: verified,
      };
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
    const sessionId = this.managerService.createSession(userId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間後

    return {
      sessionId,
      expiresAt,
    };
  }

  /**
   * ユーザープロフィール取得
   */
  async getProfile(userId: string): Promise<UserResponseDto | null> {
    try {
      const user = await this.userService.findById(userId);
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
      return this.managerService.deleteSession(sessionId);
    } catch (error) {
      return false;
    }
  }

  /**
   * セッションの有効性確認
   */
  async validateSession(sessionId: string): Promise<boolean> {
    try {
      const session = this.managerService.getSession(sessionId);
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
    return this.workflowService.validatePasswordStrength(password);
  }

  /**
   * ユーザー名形式チェック（公開メソッド）
   */
  validateUsername(username: string): {
    isValid: boolean;
    errors: string[];
  } {
    return this.workflowService.validateUsernameFormat(username);
  }

  /**
   * メールアドレス形式チェック（公開メソッド）
   */
  validateEmail(email: string): boolean {
    return this.workflowService.validateEmailFormat(email);
  }

  /**
   * 期限切れセッションのクリーンアップ
   */
  async cleanupExpiredSessions(): Promise<void> {
    this.managerService.cleanupExpiredSessions();
  }

  /**
   * JWTトークン生成
   */
  async generateJwtToken(user: UserResponseDto): Promise<TokenResponse> {
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
  async findAll(): Promise<UserResponseDto[]> {
    try {
      const users = await this.userService.findAllUsers();
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
  async findOne(id: string): Promise<UserResponseDto | null> {
    try {
      const user = await this.userService.findById(id);
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
  ): Promise<UserResponseDto | null> {
    try {
      const updateData: Partial<UpdateAuthDto> = {};

      if (updateAuthDto.username) {
        const usernameValidation = this.workflowService.validateUsernameFormat(
          updateAuthDto.username,
        );
        if (!usernameValidation.isValid) {
          throw AppErrorCodes.INVALID_USER_NAME;
        }
        updateData.username = updateAuthDto.username;
      }

      if (updateAuthDto.email) {
        if (!this.workflowService.validateEmailFormat(updateAuthDto.email)) {
          throw AppErrorCodes.INVALID_EMAIL_FORMAT;
        }
        updateData.email = updateAuthDto.email;
      }

      if (updateAuthDto.password) {
        const passwordValidation =
          this.workflowService.validatePasswordStrength(updateAuthDto.password);
        if (!passwordValidation.isValid) {
          throw AppErrorCodes.WEAK_PASSWORD;
        }
        updateData.password = updateAuthDto.password;
      }

      const updatedUser = await this.userService.updateUser(id, updateData);

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
      const existingUser = await this.userService.findById(id);
      if (!existingUser) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      await this.userService.deleteUser(id);

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
      return await this.authStateService.findAuthState(stateCode);
    } catch (error) {
      return null;
    }
  }

  /**
   * ユーザーIDでプロフィールを取得
   */
  async getUserProfileById(userId: string): Promise<UserResponseDto | null> {
    try {
      const user = await this.userService.findById(userId);
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
      const revoked = await this.jwtstateService.isJWTStateRevoked(payload.id);
      return revoked;
    } catch (error) {
      return false;
    }
  }
}
