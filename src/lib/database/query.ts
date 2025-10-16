import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export default prisma;

// ===== ユーティリティ関数 =====
export {
  hashString,
  generateRandomString,
  calculateExpiration,
} from './utility-functions';

// ===== クライアント関連クエリ =====
export {
  findClientById,
  createClient,
  updateClient,
  deleteClient,
  findAllClients,
  verifyClientSecret,
  validateRedirectUri,
} from './oauth-client';

// ===== ユーザー関連クエリ =====
export {
  findUserByUsername,
  findUserByEmail,
  findUsersByDomain,
  findUserById,
  updateUserRoles,
  createUser,
  verifyUserPassword,
  findAllUsers,
  updateUser,
  deleteUser,
  updateUserNameById,
} from './user';

// ===== 認可コード関連クエリ =====
export {
  createAuthorizationCode,
  consumeAuthorizationCode,
  verifyCodeChallenge,
} from './authorization-code';

// ===== アクセストークン関連クエリ =====
export {
  createAccessToken,
  findValidAccessToken,
  revokeAccessToken,
} from './access-token';

// ===== リフレッシュトークン関連クエリ =====
export {
  createRefreshToken,
  consumeRefreshToken,
  revokeRefreshToken,
} from './refresh-token';

// ===== ユーザー同意関連クエリ =====
export {
  findUserConsent,
  revokeUserConsent,
  upsertUserConsent,
} from './user-accept';

// ===== クリーンアップ関数 =====
export { cleanupExpiredTokens } from './cleanup';

// ===== スコープ関連ユーティリティ =====
export { isValidScope, mergeScopes } from './scope-utils';

// ===== 統計・監視用クエリ =====
export { getActiveTokensCount, getUserActiveTokensCount } from './statistics';

// ===== SNS認証関連クエリ =====
export {
  createAuthState,
  findAuthState,
  findAuthStateByToken,
  consumeAuthState,
  cleanupExpiredAuthStates,
  createSnsUser,
  findUserByProvider,
  addUserProvider,
  updateAuthStateWithUser,
  upsertExtraProfile,
  findExtraProfileByProvider,
} from './sns-oauth';

// ===== メールアドレス変更プロセス関連クエリ =====
export {
  createPendingEmailChangeProcess,
  findPendingByUserId,
  findPendingByCode,
  markPendingAsUsed,
  deletePendingById,
} from './pending-email-change-process';

// ===== パスワードリセット関連クエリ =====
export {
  createPasswordReset,
  findValidPasswordReset,
  markPasswordResetAsUsed,
  generateResetCode,
  updateUserPassword,
  cleanupExpiredPasswordResets,
} from './password-reset';

// ===== JWT状態管理関連クエリ =====
export {
  createJWTState,
  getJWTStateById,
  getAllJWTState,
  revokeJWTState,
  isJWTStateRevoked,
  deleteJWTState,
  updateJWTState,
} from './jwt-state-query';

// ===== GMOコイン関連クエリ =====
export {
  saveGmoCoinStatus,
  saveGmoCoinTicker,
  getLatestGmoCoinTicker,
  getGmoCoinTickers,
  getLatestGmoCoinStatus,
  getLatestGmoCoinKline,
  getLatestGmoCoinRules,
  saveGmoCoinKline,
  saveGmoCoinRules,
} from './gmo-coin-quety';

// ===== 外部プロバイダーのアクセストークン関連クエリ =====
export {
  createExternalProviderAccessToken,
  deleteExternalProviderAccessToken,
  getExternalProviderAccessTokenById,
  getExternalProviderAccessTokensByUserId,
  updateExternalProviderAccessToken,
  upsertExternalProviderAccessToken,
} from './external-provider-access-token';

// ===== ロール関連クエリ =====
export {
  findAllRoles,
  findRoleByName,
  findRoleById,
  createRole,
  deleteRole,
  upsertRoleByName,
} from './role-query';
