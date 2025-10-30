import { PartialType } from '@nestjs/mapped-types';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { publicUserSchema } from './decorators/auth-user.decorator';

export const authProvidersSchema = z.object({
  providers: z.array(z.string()),
});

export class AuthProvidersDto extends createZodDto(authProvidersSchema) { }

export const registerSchema = z.object({
  username: z.string(),
  email: z.email(),
  password: z.string().min(6),
});

export class RegisterDto extends createZodDto(registerSchema) { }

export const registerResponseSchema = z.object({
  message: z.string(),
  user: publicUserSchema,
});

export class RegisterResponseDto extends createZodDto(registerResponseSchema) { }

export const verifyTokenSchema = z.object({
  stateCode: z.string(),
  oneTimeToken: z.string(),
  jwtStateId: z.string().optional(),
});

export class VerifyTokenDto extends createZodDto(verifyTokenSchema) { }

export const linkProviderVerifySchema = z.object({
  provider: z.string(),
  verifyCode: z.string(),
});

export class LinkProviderVerifyDto extends createZodDto(
  linkProviderVerifySchema,
) { }

export const refreshTokenSchema = z.object({
  refresh_token: z.string(),
});

export class RefreshTokenDto extends createZodDto(refreshTokenSchema) { }

export const authStateSchema = z.object({
  provider: z.string(),
  callbackUrl: z.url(),
  userId: z.string().optional(),
});

export class AuthStateDto extends createZodDto(authStateSchema) { }

export const authStateResponseSchema = z.object({
  message: z.string(),
  code: z.string(),
  redirectUrl: z.url(),
});

export class AuthStateResponseDto extends createZodDto(
  authStateResponseSchema,
) { }

export const usernameSchema = z
  .string()
  .min(3, { message: 'ユーザー名は3文字以上で入力してください' })
  .max(50, { message: 'ユーザー名は50文字以内で入力してください' })
  .regex(/^[a-zA-Z0-9_-]+$/, {
    message:
      'ユーザー名は英字、数字、アンダースコア、ハイフンのみ使用できます',
  });

export const createAuthSchema = z.object({
  username: usernameSchema.optional(),
  email: z
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

export class CreateAuthDto extends createZodDto(createAuthSchema) { }

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

export class LoginDto extends createZodDto(loginSchema) { }
export class UpdateAuthDto extends PartialType(CreateAuthDto) { }

export const UserResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.email(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export class UserResponseDto extends createZodDto(UserResponseSchema) { }

export const LoginResponseSchema = z.object({
  message: z.string().default('Login successful'),
  jwtId: z.string(),
  provider: z.string(),
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number(),
  refresh_token: z.string(),
  refresh_expires_in: z.number(),
  session_id: z.string(),
});

export class LoginResponseDto extends createZodDto(LoginResponseSchema) { }

export const refreshTokenResponseSchema = z.object({
  message: z.string().default('Token refreshed successfully'),
  jwtId: z.string(),
  access_token: z.string(),
  token_type: z.string().default('Bearer'),
  expires_in: z.number(),
});

export class RefreshTokenResponseDto extends createZodDto(
  refreshTokenResponseSchema,
) { }

export const authVerifyResponseSchema = z.object({
  message: z.string().default('Token verified successfully'),
  jti: z.string(),
  access_token: z.string(),
  refresh_token: z.string(),
  provider: z.string(),
});

export class AuthVerifyResponseDto extends createZodDto(
  authVerifyResponseSchema,
) { }
