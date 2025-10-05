/**
 * OAuth 2.0 コントローラーのレスポンス型定義
 */

import { ConsentInfo } from '../lib/oauth/authorization';

/**
 * 認可エンドポイントのレスポンス型
 */
export interface AuthorizeResponse {
  // リダイレクトレスポンス
  url?: string;
  statusCode?: number;

  // 同意画面が必要な場合
  message?: string;
  consent_info?: ConsentInfo;
}

/**
 * トークンエンドポイントのレスポンス型
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * トークン失効エンドポイントのレスポンス型
 * RFC 7009に従い、成功時はボディなし（void）
 */
export type RevokeResponse = void;

/**
 * トークン情報確認エンドポイントのレスポンス型
 */
export interface IntrospectResponse {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  aud?: string;
  iss?: string;
  jti?: string;
}

/**
 * ユーザー情報エンドポイントのレスポンス型
 * OpenID Connect UserInfo Endpoint 準拠
 */
export interface UserInfoResponse {
  sub: string; // Subject - 必須
  name?: string;
  given_name?: string;
  family_name?: string;
  middle_name?: string;
  nickname?: string;
  preferred_username?: string;
  profile?: string;
  picture?: string;
  website?: string;
  email?: string;
  email_verified?: boolean;
  gender?: string;
  birthdate?: string;
  zoneinfo?: string;
  locale?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
  address?: {
    formatted?: string;
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
  updated_at?: number;
}

/**
 * 同意処理エンドポイントのレスポンス型
 */
export interface ConsentResponse {
  message: string;
}

/**
 * OAuth 2.0 エラーレスポンス型
 */
export interface OAuth2ErrorResponse {
  error: string;
  error_description?: string;
  error_uri?: string;
  state?: string;
}

/**
 * 認可エンドポイントで使用される内部処理結果型
 */
export interface AuthorizeProcessResult {
  success: boolean;
  redirectUri?: string;
  needsConsent?: boolean;
  consentInfo?: {
    client_name: string;
    requested_scope: string;
    user_id: string;
  };
  error?: string;
  errorDescription?: string;
}

/**
 * トークンエンドポイントで使用される内部処理結果型
 */
export interface TokenProcessResult {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

/**
 * トークン失効エンドポイントで使用される内部処理結果型
 */
export interface RevokeProcessResult {
  success: boolean;
  error?: string;
  error_description?: string;
}

/**
 * トークン情報確認エンドポイントで使用される内部処理結果型
 */
export interface IntrospectProcessResult {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  aud?: string;
  iss?: string;
  jti?: string;
  error?: string;
  error_description?: string;
}

/**
 * ユーザー情報エンドポイントで使用される内部処理結果型
 */
export interface UserInfoProcessResult extends UserInfoResponse {
  error?: string;
  error_description?: string;
}

/**
 * 同意処理エンドポイントで使用される内部処理結果型
 */
export interface ConsentProcessResult {
  success: boolean;
  error?: string;
}
