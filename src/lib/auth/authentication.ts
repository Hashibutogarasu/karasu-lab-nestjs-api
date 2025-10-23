/**
 * 認証関連のワークフロー処理
 */

import z from 'zod';
import { PublicUser } from '../../auth/decorators/auth-user.decorator';
import { createZodDto } from 'nestjs-zod';

export const registerRequestSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6),
});

export class RegisterRequest extends createZodDto(registerRequestSchema) {}

export const loginRequestSchema = z.object({
  usernameOrEmail: z.string(),
  password: z.string(),
});

export class LoginRequest extends createZodDto(loginRequestSchema) {}

export const authResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  errorDescription: z.string().optional(),
});

export interface AuthResponse {
  success: boolean;
  user?: PublicUser;
  error?: string;
  errorDescription?: string;
}
