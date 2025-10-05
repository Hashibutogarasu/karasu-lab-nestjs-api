// OAuth 2.0 認可エンドポイント用クエリパラメータ
export class AuthorizeQueryDto {
  response_type: string; // 必須: "code"
  client_id: string; // 必須
  redirect_uri: string; // 必須
  scope?: string; // オプション
  state: string; // 必須 (CSRF対策)
  code_challenge?: string; // PKCE用 (推奨)
  code_challenge_method?: string; // PKCE用 (推奨)
}

// OAuth 2.0 トークンエンドポイント用リクエストボディ
export class TokenRequestDto {
  grant_type: string; // 必須
  code?: string; // 認可コードグラント時に必須
  redirect_uri: string; // 必須
  client_id: string; // 必須
  client_secret?: string; // コンフィデンシャルクライアントの場合必須
  code_verifier?: string; // PKCE使用時に必須
  refresh_token?: string; // リフレッシュトークン使用時に必須
}

// OAuth 2.0 トークン失効用リクエストボディ
export class RevokeTokenDto {
  token: string; // 必須（失効するトークン）
  token_type_hint?: 'access_token' | 'refresh_token'; // オプション
  client_id: string; // 必須（クライアント認証）
  client_secret?: string; // コンフィデンシャルクライアントの場合必須
}

// OAuth 2.0 トークン情報確認用リクエストボディ
export class IntrospectTokenDto {
  token: string; // 必須（確認するトークン）
  client_id: string; // 必須（クライアント認証）
  client_secret?: string; // コンフィデンシャルクライアントの場合必須
}

// OAuth 2.0 ユーザー情報エンドポイント用（Authorizationヘッダーから取得）
export class UserInfoDto {
  // このDTOはAuthorizationヘッダーのBearerトークンを受け取るため、
  // リクエストボディは不要。ヘッダーから自動で抽出される。
}

// OAuth 2.0 認可リクエスト作成用DTO
export class CreateOauthDto {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state: string;
}
