import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthResponse } from '../lib/auth/authentication';
import { WorkflowService } from './sns/workflow/workflow.service';
import { UserService } from '../data-base/query/user/user.service';
import { AuthStateService } from '../data-base/query/auth-state/auth-state.service';
import { JwtstateService } from '../data-base/query/jwtstate/jwtstate.service';
import { JwtPayload } from './jwt.strategy';
import { AppErrorCode, AppErrorCodes } from '../types/error-codes';
import {
  LoginDto,
  RegisterDto,
  UpdateAuthDto,
  UserResponseDto,
} from './auth.dto';
import { DateTimeService } from '../date-time/date-time.service';
import { JwtTokenService } from './jwt-token/jwt-token.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private readonly userService: UserService,
    private readonly authStateService: AuthStateService,
    private readonly jwtstateService: JwtstateService,
    private readonly workflowService: WorkflowService,
    private readonly dateTimeService: DateTimeService,
    private readonly jwtTokenService: JwtTokenService,
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
        throw AppErrorCodes.INVALID_CREDENTIALS;
      }

      const { passwordHash, createdAt, updatedAt, ...user } = verified;

      return {
        success: true,
        user: {
          ...user,
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        },
      };
    } catch (error) {
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
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
      const existingUser = await this.userService.findById(id);
      if (!existingUser) {
        throw AppErrorCodes.USER_NOT_FOUND;
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
