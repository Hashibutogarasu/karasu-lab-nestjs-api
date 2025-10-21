import { Role } from '@prisma/client';

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
