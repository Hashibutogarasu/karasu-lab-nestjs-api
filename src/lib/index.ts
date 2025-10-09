/**
 * OAuth 2.0 ワークフロー統合レイヤー
 * 各種OAuth 2.0処理を統合し、簡単にアクセスできるようにする
 */

// 認可フロー関連
export {
  validateAuthorizeRequest,
  checkUserConsent,
  generateAuthorizationCode,
  processUserConsent,
  buildErrorRedirectUri,
} from './oauth/authorization';
export type { AuthorizeRequest, AuthorizeResult } from './oauth/authorization';

// トークンエンドポイント関連
export {
  authenticateClient,
  processAuthorizationCodeGrant,
  processRefreshTokenGrant,
  processClientCredentialsGrant,
  processTokenRequest,
} from './oauth/token';
export type { TokenRequest, TokenResponse } from './oauth/token';

// トークン失効関連
export { revokeToken, revokeAllRelatedTokens } from './oauth/revocation';
export type {
  RevokeTokenRequest,
  RevokeTokenResponse,
} from './oauth/revocation';

// トークンイントロスペクション関連
export {
  introspectToken,
  isTokenValid,
  getUserInfoFromToken,
} from './oauth/introspection';
export type {
  IntrospectTokenRequest,
  IntrospectTokenResponse,
} from './oauth/introspection';

// ユーザー情報エンドポイント関連
export {
  getUserInfo,
  extractBearerToken,
  filterClaimsByScope,
} from './oauth/userinfo';
export type {
  UserInfoRequest,
  UserInfoResponse,
  Address,
} from './oauth/userinfo';

// 認証関連
export {
  registerUser,
  loginUser,
  validatePasswordStrength,
  validateEmailFormat,
  validateUsernameFormat,
  SessionManager,
} from './auth/authentication';
export type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
} from './auth/authentication';

// JWTトークン関連
export {
  generateJWTToken,
  verifyJWTToken,
  decodeJWTToken,
  isTokenExpired,
  getTokenRemainingTime,
  generateRefreshToken,
  getTokenMetadata,
} from './auth/jwt-token';
export type {
  JWTPayload,
  CreateTokenRequest,
  CreateTokenResponse,
  VerifyTokenResponse,
} from './auth/jwt-token';

// システムユーティリティ関連
export {
  performCleanup,
  getSystemStats,
  getUserTokenStats,
  CleanupScheduler,
  OAuth2ErrorHandler,
  SecurityAuditLogger,
} from './oauth/utils';
export type { SystemStats, UserTokenStats } from './oauth/utils';

// データベースクエリ関数（直接アクセス用）
export * from './database/query';
