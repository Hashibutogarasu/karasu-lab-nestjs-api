import { Injectable } from '@nestjs/common';
import z from 'zod';
import { AuthResponse, LoginRequest, RegisterRequest } from '../../../lib';
import { UserService } from '../../../data-base/query/user/user.service';
import { AppErrorCodes } from '../../../types/error-codes';
import { usernameSchema } from '../../auth.dto';
import { DateTimeService } from '../../../date-time/date-time.service';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly userService: UserService,
    private readonly dateTimeService: DateTimeService,
  ) {}

  /**
   * ユーザー登録処理
   */
  async registerUser(request: RegisterRequest): Promise<AuthResponse> {
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
      const existingUserByUsername = await this.userService.findUserByUsername(
        request.username,
      );
      if (existingUserByUsername) {
        return {
          success: false,
          error: 'user_exists',
          errorDescription: 'Username is already taken.',
        };
      }

      // メールアドレスの重複チェック
      const existingUserByEmail = await this.userService.findUserByEmail(
        request.email,
      );
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
      const newUser = await this.userService.createUser({
        username: request.username,
        email: request.email,
        password: request.password,
      });

      return {
        success: true,
        user: newUser,
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
  async loginUser(request: LoginRequest): Promise<AuthResponse> {
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
      const verifiedUser = await this.userService.verifyUserPassword(
        request.usernameOrEmail,
        request.password,
      );

      if (!verifiedUser) {
        throw AppErrorCodes.INVALID_CREDENTIALS;
      }

      const { passwordHash, createdAt, updatedAt, ...user } = verifiedUser;

      return {
        success: true,
        user: {
          ...user,
          createdAt: this.dateTimeService.toIsoDatetimeFromDate(createdAt),
          updatedAt: this.dateTimeService.toIsoDatetimeFromDate(updatedAt),
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
  validatePasswordStrength(password: string): {
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
  validateEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * ユーザー名形式の検証
   */
  validateUsernameFormat(username: string): {
    isValid: boolean;
    errors: string[];
  } {
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
}
