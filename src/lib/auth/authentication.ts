/**
 * 認証関連のワークフロー処理
 */

import { PublicUser } from '../../auth/decorators/auth-user.decorator';

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
  user?: PublicUser;
  error?: string;
  errorDescription?: string;
}
