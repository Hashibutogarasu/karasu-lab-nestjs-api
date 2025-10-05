import { z } from 'zod';

/**
 * OAuth 2.0関連のZodスキーマ定義
 */

// OAuth 2.0 認可エンドポイント用クエリパラメータ
export const AuthorizeQuerySchema = z.object({
  response_type: z
    .string()
    .refine(
      (val) => val === 'code',
      'response_typeは"code"である必要があります',
    ),
  client_id: z
    .string()
    .min(1, 'client_idは必須です')
    .max(255, 'client_idは255文字以内である必要があります'),
  redirect_uri: z
    .string()
    .url('有効なURLを指定してください')
    .max(2048, 'redirect_uriは2048文字以内である必要があります'),
  scope: z
    .string()
    .max(1000, 'scopeは1000文字以内である必要があります')
    .optional(),
  state: z
    .string()
    .min(1, 'stateパラメータは必須です（CSRF対策）')
    .max(255, 'stateは255文字以内である必要があります'),
  code_challenge: z
    .string()
    .min(43, 'code_challengeは43文字以上である必要があります')
    .max(128, 'code_challengeは128文字以内である必要があります')
    .optional(),
  code_challenge_method: z.enum(['S256', 'plain']).optional().default('S256'),
});

// OAuth 2.0 トークンエンドポイント用リクエストボディ
export const TokenRequestSchema = z
  .object({
    grant_type: z
      .enum(['authorization_code', 'refresh_token', 'client_credentials'])
      .refine(
        (val) =>
          [
            'authorization_code',
            'refresh_token',
            'client_credentials',
          ].includes(val),
        'サポートされていないgrant_typeです',
      ),
    code: z
      .string()
      .min(1, '認可コードは必須です')
      .max(255, '認可コードは255文字以内である必要があります')
      .optional(),
    redirect_uri: z
      .string()
      .url('有効なURLを指定してください')
      .max(2048, 'redirect_uriは2048文字以内である必要があります'),
    client_id: z
      .string()
      .min(1, 'client_idは必須です')
      .max(255, 'client_idは255文字以内である必要があります'),
    client_secret: z
      .string()
      .min(1, 'client_secretは必須です')
      .max(255, 'client_secretは255文字以内である必要があります')
      .optional(),
    code_verifier: z
      .string()
      .min(43, 'code_verifierは43文字以上である必要があります')
      .max(128, 'code_verifierは128文字以内である必要があります')
      .optional(),
    refresh_token: z
      .string()
      .min(1, 'refresh_tokenは必須です')
      .max(500, 'refresh_tokenは500文字以内である必要があります')
      .optional(),
  })
  .refine(
    (data) => {
      // grant_typeに応じた必須フィールドのバリデーション
      if (data.grant_type === 'authorization_code') {
        return data.code !== undefined;
      }
      if (data.grant_type === 'refresh_token') {
        return data.refresh_token !== undefined;
      }
      return true;
    },
    {
      message: 'grant_typeに対応する必須パラメータが不足しています',
    },
  );

// OAuth 2.0 トークン失効用リクエストボディ
export const RevokeTokenSchema = z.object({
  token: z
    .string()
    .min(1, '失効するトークンは必須です')
    .max(500, 'tokenは500文字以内である必要があります'),
  token_type_hint: z.enum(['access_token', 'refresh_token']).optional(),
  client_id: z
    .string()
    .min(1, 'client_idは必須です')
    .max(100, 'client_idは100文字以内である必要があります'),
  client_secret: z
    .string()
    .max(255, 'client_secretは255文字以内である必要があります')
    .optional(),
});

// OAuth 2.0 トークン情報確認用リクエストボディ
export const IntrospectTokenSchema = z.object({
  token: z
    .string()
    .min(1, '確認するトークンは必須です')
    .max(500, 'tokenは500文字以内である必要があります'),
  client_id: z
    .string()
    .min(1, 'client_idは必須です')
    .max(100, 'client_idは100文字以内である必要があります'),
  client_secret: z
    .string()
    .max(255, 'client_secretは255文字以内である必要があります')
    .optional(),
});

// OAuth 2.0 認可リクエスト作成用DTO
export const CreateOauthSchema = z.object({
  response_type: z
    .string()
    .refine(
      (val) => val === 'code',
      'response_typeは"code"である必要があります',
    ),
  client_id: z
    .string()
    .min(1, 'client_idは必須です')
    .max(255, 'client_idは255文字以内である必要があります'),
  redirect_uri: z
    .string()
    .url('有効なURLを指定してください')
    .max(2048, 'redirect_uriは2048文字以内である必要があります'),
  scope: z
    .string()
    .max(1000, 'scopeは1000文字以内である必要があります')
    .optional(),
  state: z
    .string()
    .min(1, 'stateパラメータは必須です（CSRF対策）')
    .max(255, 'stateは255文字以内である必要があります'),
});

// UpdateOauthDto用スキーマ（部分更新）
export const UpdateOauthSchema = CreateOauthSchema.partial();

/**
 * レスポンス用スキーマ
 */

// トークンレスポンス用
export const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string().default('Bearer'),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

// 認可レスポンス用
export const AuthorizeResponseSchema = z.object({
  code: z.string(),
  state: z.string(),
});

// トークン情報レスポンス用
export const IntrospectResponseSchema = z.object({
  active: z.boolean(),
  scope: z.string().optional(),
  client_id: z.string().optional(),
  username: z.string().optional(),
  token_type: z.string().optional(),
  exp: z.number().optional(),
  iat: z.number().optional(),
  nbf: z.number().optional(),
  sub: z.string().optional(),
  aud: z.string().optional(),
  iss: z.string().optional(),
  jti: z.string().optional(),
});

// エラーレスポンス用
export const OAuthErrorResponseSchema = z.object({
  error: z.enum([
    'invalid_request',
    'invalid_client',
    'invalid_grant',
    'unauthorized_client',
    'unsupported_grant_type',
    'invalid_scope',
    'server_error',
    'temporarily_unavailable',
  ]),
  error_description: z.string().optional(),
  error_uri: z.string().url().optional(),
  state: z.string().optional(),
});

/**
 * パーサー関数群
 */

export const parseAuthorizeQuery = (input: unknown) => {
  return AuthorizeQuerySchema.parse(input);
};

export const parseTokenRequest = (input: unknown) => {
  return TokenRequestSchema.parse(input);
};

export const parseRevokeToken = (input: unknown) => {
  return RevokeTokenSchema.parse(input);
};

export const parseIntrospectToken = (input: unknown) => {
  return IntrospectTokenSchema.parse(input);
};

export const parseCreateOauth = (input: unknown) => {
  return CreateOauthSchema.parse(input);
};

export const parseUpdateOauth = (input: unknown) => {
  return UpdateOauthSchema.parse(input);
};

export const parseTokenResponse = (input: unknown) => {
  return TokenResponseSchema.parse(input);
};

export const parseAuthorizeResponse = (input: unknown) => {
  return AuthorizeResponseSchema.parse(input);
};

export const parseIntrospectResponse = (input: unknown) => {
  return IntrospectResponseSchema.parse(input);
};

export const parseOAuthErrorResponse = (input: unknown) => {
  return OAuthErrorResponseSchema.parse(input);
};

/**
 * セーフパーサー関数群（エラーハンドリング付き）
 */

export const safeParseAuthorizeQuery = (input: unknown) => {
  return AuthorizeQuerySchema.safeParse(input);
};

export const safeParseTokenRequest = (input: unknown) => {
  return TokenRequestSchema.safeParse(input);
};

export const safeParseRevokeToken = (input: unknown) => {
  return RevokeTokenSchema.safeParse(input);
};

export const safeParseIntrospectToken = (input: unknown) => {
  return IntrospectTokenSchema.safeParse(input);
};

export const safeParseCreateOauth = (input: unknown) => {
  return CreateOauthSchema.safeParse(input);
};

export const safeParseUpdateOauth = (input: unknown) => {
  return UpdateOauthSchema.safeParse(input);
};

export const safeParseTokenResponse = (input: unknown) => {
  return TokenResponseSchema.safeParse(input);
};

export const safeParseAuthorizeResponse = (input: unknown) => {
  return AuthorizeResponseSchema.safeParse(input);
};

export const safeParseIntrospectResponse = (input: unknown) => {
  return IntrospectResponseSchema.safeParse(input);
};

export const safeParseOAuthErrorResponse = (input: unknown) => {
  return OAuthErrorResponseSchema.safeParse(input);
};

/**
 * TypeScript型定義
 */

export type AuthorizeQueryInput = z.infer<typeof AuthorizeQuerySchema>;
export type TokenRequestInput = z.infer<typeof TokenRequestSchema>;
export type RevokeTokenInput = z.infer<typeof RevokeTokenSchema>;
export type IntrospectTokenInput = z.infer<typeof IntrospectTokenSchema>;
export type CreateOauthInput = z.infer<typeof CreateOauthSchema>;
export type UpdateOauthInput = z.infer<typeof UpdateOauthSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type AuthorizeResponse = z.infer<typeof AuthorizeResponseSchema>;
export type IntrospectResponse = z.infer<typeof IntrospectResponseSchema>;
export type OAuthErrorResponse = z.infer<typeof OAuthErrorResponseSchema>;
