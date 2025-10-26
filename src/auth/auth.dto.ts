import { PartialType } from '@nestjs/mapped-types';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { publicUserSchema } from './decorators/auth-user.decorator';

export const authProvidersSchema = z.object({
  providers: z.array(z.string()),
});

export class AuthProvidersDto extends createZodDto(authProvidersSchema) {}

export const registerSchema = z.object({
  username: z.string(),
  email: z.email(),
  password: z.string().min(6),
});

export class RegisterDto extends createZodDto(registerSchema) {}

export const registerResponseSchema = z.object({
  message: z.string(),
  user: publicUserSchema,
});

export class RegisterResponseDto extends createZodDto(registerResponseSchema) {}

export const verifyTokenSchema = z.object({
  stateCode: z.string(),
  oneTimeToken: z.string(),
});

export class VerifyTokenDto extends createZodDto(verifyTokenSchema) {}

export const refreshTokenSchema = z.object({
  refresh_token: z.string(),
});

export class RefreshTokenDto extends createZodDto(refreshTokenSchema) {}

export const authStateSchema = z.object({
  provider: z.string(),
  callbackUrl: z.url(),
});

export class AuthStateDto extends createZodDto(authStateSchema) {}

export const createAuthSchema = z.object({
  username: z
    .string()
    .min(3, 'ユーザー名は3文字以上で入力してください')
    .max(50, 'ユーザー名は50文字以内で入力してください')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'ユーザー名は英数字、アンダースコア、ハイフンのみ使用可能です',
    )
    .optional(),
  email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .max(255, 'メールアドレスは255文字以内で入力してください')
    .optional(),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(128, 'パスワードは128文字以内で入力してください')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'パスワードは大文字、小文字、数字をそれぞれ1文字以上含む必要があります',
    )
    .optional(),
});

export class CreateAuthDto extends createZodDto(createAuthSchema) {}

export const loginSchema = z.object({
  usernameOrEmail: z
    .string()
    .min(1, 'ユーザー名またはメールアドレスを入力してください')
    .max(255, '入力値は255文字以内で入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(128, 'パスワードは128文字以内で入力してください'),
});

export class LoginDto extends createZodDto(loginSchema) {}
export class UpdateAuthDto extends PartialType(CreateAuthDto) {}

export const usernameSchema = z
  .string()
  .min(3, { message: 'Username must be at least 3 characters long' })
  .max(50, { message: 'Username must be no more than 50 characters long' })
  .regex(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Username can only contain letters, numbers, underscores, and hyphens',
  });

// ユーザー情報レスポンス用（パスワードを除く）
export const UserResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.email(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export class UserResponseDto extends createZodDto(UserResponseSchema) {}

export const LoginResponseSchema = z.object({
  message: z.string().default('Login successful'),
  jwtId: z.string(),
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number(),
  refresh_token: z.string(),
  refresh_expires_in: z.number(),
  session_id: z.string(),
});

export class LoginResponseDto extends createZodDto(LoginResponseSchema) {}

export const refreshTokenResponseSchema = z.object({
  message: z.string().default('Token refreshed successfully'),
  jwtId: z.string(),
  access_token: z.string(),
  token_type: z.string().default('Bearer'),
  expires_in: z.number(),
});

export class RefreshTokenResponseDto extends createZodDto(
  refreshTokenResponseSchema,
) {}
