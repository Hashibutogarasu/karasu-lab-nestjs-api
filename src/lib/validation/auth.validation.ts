import { z } from 'zod';

/**
 * 認証関連のZodスキーマ定義
 */

// ユーザー登録用スキーマ
export const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, 'ユーザー名は3文字以上で入力してください')
    .max(50, 'ユーザー名は50文字以内で入力してください')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'ユーザー名は英数字、アンダースコア、ハイフンのみ使用可能です',
    ),
  email: z
    .email('有効なメールアドレスを入力してください')
    .max(255, 'メールアドレスは255文字以内で入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(128, 'パスワードは128文字以内で入力してください')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'パスワードは大文字、小文字、数字をそれぞれ1文字以上含む必要があります',
    ),
});

// ログイン用スキーマ
export const LoginSchema = z.object({
  usernameOrEmail: z
    .string()
    .min(1, 'ユーザー名またはメールアドレスを入力してください')
    .max(255, '入力値は255文字以内で入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(128, 'パスワードは128文字以内で入力してください'),
});

// CreateAuthDto用スキーマ（互換性のため）
export const CreateAuthSchema = RegisterSchema;

// UpdateAuthDto用スキーマ（部分更新）
export const UpdateAuthSchema = z.object({
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

/**
 * レスポンス用スキーマ
 */

// ユーザー情報レスポンス用（パスワードを除く）
export const UserResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.email(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

// ログイン成功レスポンス用
export const LoginResponseSchema = z.object({
  user: UserResponseSchema,
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
});

/**
 * パーサー関数群
 */

export const parseRegisterInput = (input: unknown) => {
  return RegisterSchema.parse(input);
};

export const parseLoginInput = (input: unknown) => {
  return LoginSchema.parse(input);
};

export const parseCreateAuthInput = (input: unknown) => {
  return CreateAuthSchema.parse(input);
};

export const parseUpdateAuthInput = (input: unknown) => {
  return UpdateAuthSchema.parse(input);
};

export const parseUserResponse = (input: unknown) => {
  return UserResponseSchema.parse(input);
};

export const parseLoginResponse = (input: unknown) => {
  return LoginResponseSchema.parse(input);
};

/**
 * セーフパーサー関数群（エラーハンドリング付き）
 */

export const safeParseRegisterInput = (input: unknown) => {
  return RegisterSchema.safeParse(input);
};

export const safeParseLoginInput = (input: unknown) => {
  return LoginSchema.safeParse(input);
};

export const safeParseCreateAuthInput = (input: unknown) => {
  return CreateAuthSchema.safeParse(input);
};

export const safeParseUpdateAuthInput = (input: unknown) => {
  return UpdateAuthSchema.safeParse(input);
};

export const safeParseUserResponse = (input: unknown) => {
  return UserResponseSchema.safeParse(input);
};

export const safeParseLoginResponse = (input: unknown) => {
  return LoginResponseSchema.safeParse(input);
};

/**
 * TypeScript型定義
 */

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateAuthInput = z.infer<typeof CreateAuthSchema>;
export type UpdateAuthInput = z.infer<typeof UpdateAuthSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
