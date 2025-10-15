import { JWTState, PrismaClient, User } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UpdateJwtStateDto } from '../../jwt-state/dto/jwt-state.dto';
import {
  ExternalProviderAccessTokenCreateSchema,
  ExternalProviderAccessTokenUpdateSchema,
} from '../../types/external-provider-access-token';
import { PublicUser } from '../../auth/decorators/auth-user.decorator';

const prisma = new PrismaClient();

// ===== ユーティリティ関数 =====

/**
 * SHA256ハッシュ化
 */
export function hashString(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * ランダムな文字列生成
 */
export function generateRandomString(length: number): string {
  return randomBytes(length).toString('hex');
}

/**
 * トークンの有効期限計算
 */
export function calculateExpiration(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

// ===== クライアント関連クエリ =====

/**
 * クライアントIDでクライアント情報を取得
 */
export async function findClientById(clientId: string) {
  return prisma.client.findUnique({
    where: { id: clientId },
  });
}

/**
 * クライアントを作成
 */
export async function createClient(data: {
  id: string;
  secret: string;
  name: string;
  redirectUris: string[];
  grantTypes: string[];
  scope?: string;
}) {
  return prisma.client.create({
    data: {
      ...data,
      secret: hashString(data.secret), // シークレットをハッシュ化
    },
  });
}

/**
 * クライアント情報を更新
 */
export async function updateClient(
  clientId: string,
  data: Partial<{
    name: string;
    redirectUris: string[];
    grantTypes: string[];
    scope?: string;
  }>,
) {
  return prisma.client.update({
    where: { id: clientId },
    data,
  });
}

/**
 * クライアントを削除
 */
export async function deleteClient(clientId: string) {
  return prisma.client.delete({
    where: { id: clientId },
  });
}

/**
 * 全てのクライアントを取得
 */
export async function findAllClients() {
  return prisma.client.findMany({
    select: {
      id: true,
      name: true,
      redirectUris: true,
      grantTypes: true,
      scope: true,
      createdAt: true,
      updatedAt: true,
      // secretは含めない（セキュリティ上の理由）
    },
  });
}

/**
 * クライアントシークレットを検証
 */
export async function verifyClientSecret(
  clientId: string,
  secret: string,
): Promise<boolean> {
  const client = await findClientById(clientId);
  if (!client) return false;

  const hashedSecret = hashString(secret);
  return client.secret === hashedSecret;
}

/**
 * リダイレクトURIを検証
 */
export async function validateRedirectUri(
  clientId: string,
  redirectUri: string,
): Promise<boolean> {
  const client = await findClientById(clientId);
  if (!client) return false;

  return client.redirectUris.includes(redirectUri);
}

// ===== ユーザー関連クエリ =====

/**
 * ユーザー名でユーザーを取得
 */
export async function findUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
  });
}

/**
 * メールアドレスでユーザーを取得
 */
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

/**
 * ユーザーIDでユーザーを取得
 */
export async function findUserById(
  userId: string,
  { passwordHash = false } = {},
) {
  return prisma.user.findFirst({
    where: { id: userId },
    omit: {
      passwordHash: passwordHash,
    },
    include: {
      extraProfiles: true,
      roles: true,
    },
  });
}

/**
 * ユーザー名を更新
 */
export async function updateUserNameById(userId: string, username: string) {
  const existingUser = await findUserByUsername(username);
  if (existingUser && existingUser.id !== userId) {
    throw new Error('Username already taken');
  }
  return prisma.user.update({
    where: { id: userId },
    data: { username },
  });
}

/**
 * ユーザーを作成
 */
export async function createUser(data: {
  username: string;
  email: string;
  password: string;
}) {
  return prisma.user.create({
    data: {
      username: data.username,
      email: data.email,
      passwordHash: hashString(data.password),
    },
    select: {
      id: true,
      username: true,
      email: true,
      roles: true,
      passwordHash: false,
    },
  });
}

/**
 * ユーザーパスワードを検証
 */
export async function verifyUserPassword(
  usernameOrEmail: string,
  password: string,
): Promise<PublicUser | null> {
  // ユーザー名またはメールアドレスでユーザーを検索
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    },
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      providers: true,
      passwordHash: true,
      roles: true,
      extraProfiles: true,
    },
  });

  if (!user) {
    return null;
  }

  const hashedPassword = hashString(password);
  const isValid = user.passwordHash === hashedPassword;

  if (!isValid) return null;

  // Remove passwordHash before returning as PublicUser
  const { passwordHash, ...publicUser } = user;
  return publicUser as PublicUser;
}

/**
 * 全てのユーザーを取得（管理者向け）
 */
export async function findAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      // passwordHashは含めない（セキュリティ上の理由）
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * ユーザー情報を更新
 */
export async function updateUser(
  userId: string,
  data: Partial<{
    username: string;
    email: string;
    password: string;
  }>,
) {
  const updateData: any = {};

  if (data.username) {
    updateData.username = data.username;
  }
  if (data.email) {
    updateData.email = data.email;
  }
  if (data.password) {
    updateData.passwordHash = hashString(data.password);
  }

  return prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      // passwordHashは含めない
    },
  });
}

/**
 * ユーザーを削除
 */
export async function deleteUser(userId: string) {
  return prisma.user.delete({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      // passwordHashは含めない
    },
  });
}

// ===== 認可コード関連クエリ =====

/**
 * 認可コードを作成
 */
export async function createAuthorizationCode(data: {
  clientId: string;
  userId: string;
  redirectUri: string;
  scope?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}) {
  const code = generateRandomString(32); // 64文字の認可コード生成
  const hashedCode = hashString(code);

  await prisma.authorizationCode.create({
    data: {
      code: hashedCode,
      clientId: data.clientId,
      userId: data.userId,
      redirectUri: data.redirectUri,
      scope: data.scope,
      codeChallenge: data.codeChallenge,
      codeChallengeMethod: data.codeChallengeMethod,
      expiresAt: calculateExpiration(10), // 10分間有効
    },
  });

  return code; // 元のコードを返す（ハッシュ化前）
}

/**
 * 認可コードを取得して削除（一度のみ使用）
 */
export async function consumeAuthorizationCode(code: string) {
  const hashedCode = hashString(code);

  const authCode = await prisma.authorizationCode.findUnique({
    where: { code: hashedCode },
    include: { client: true, user: true },
  });

  if (!authCode) return null;

  // 有効期限チェック
  if (authCode.expiresAt < new Date()) {
    await prisma.authorizationCode.delete({
      where: { code: hashedCode },
    });
    return null;
  }

  // 認可コードを削除（一度のみ使用）
  await prisma.authorizationCode.delete({
    where: { code: hashedCode },
  });

  return authCode;
}

/**
 * PKCEコードチャレンジを検証
 */
export function verifyCodeChallenge(
  codeVerifier: string,
  codeChallenge: string,
  method: string = 'S256',
): boolean {
  if (method === 'S256') {
    const hashedVerifier = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    return hashedVerifier === codeChallenge;
  } else if (method === 'plain') {
    return codeVerifier === codeChallenge;
  }
  return false;
}

// ===== アクセストークン関連クエリ =====

/**
 * アクセストークンを作成
 */
export async function createAccessToken(data: {
  clientId: string;
  userId: string;
  scope?: string;
}) {
  const token = generateRandomString(64); // 128文字のトークン生成

  await prisma.accessToken.create({
    data: {
      token,
      clientId: data.clientId,
      userId: data.userId,
      scope: data.scope,
      expiresAt: calculateExpiration(60), // 60分間有効
    },
  });

  return token;
}

/**
 * アクセストークンを取得（検証付き）
 */
export async function findValidAccessToken(token: string) {
  const accessToken = await prisma.accessToken.findUnique({
    where: { token },
    include: { client: true, user: true },
  });

  if (!accessToken) return null;

  // 有効期限チェック
  if (accessToken.expiresAt < new Date()) {
    await prisma.accessToken.delete({
      where: { token },
    });
    return null;
  }

  return accessToken;
}

/**
 * アクセストークンを無効化
 */
export async function revokeAccessToken(token: string): Promise<boolean> {
  try {
    await prisma.accessToken.delete({
      where: { token },
    });
    return true;
  } catch {
    return false;
  }
}

// ===== リフレッシュトークン関連クエリ =====

/**
 * リフレッシュトークンを作成
 */
export async function createRefreshToken(data: {
  accessToken: string;
  clientId: string;
  userId: string;
  scope?: string;
}) {
  const token = generateRandomString(64); // 128文字のトークン生成
  const hashedToken = hashString(token);

  await prisma.refreshToken.create({
    data: {
      token: hashedToken,
      accessToken: data.accessToken,
      clientId: data.clientId,
      userId: data.userId,
      scope: data.scope,
      expiresAt: calculateExpiration(30 * 24 * 60), // 30日間有効
    },
  });

  return token; // 元のトークンを返す（ハッシュ化前）
}

/**
 * リフレッシュトークンを取得して削除（ローテーション）
 */
export async function consumeRefreshToken(token: string) {
  const hashedToken = hashString(token);

  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token: hashedToken },
    include: { client: true, user: true },
  });

  if (!refreshToken) return null;

  // 有効期限チェック
  if (refreshToken.expiresAt < new Date()) {
    await prisma.refreshToken.delete({
      where: { token: hashedToken },
    });
    return null;
  }

  // リフレッシュトークンを削除（ローテーション）
  await prisma.refreshToken.delete({
    where: { token: hashedToken },
  });

  return refreshToken;
}

/**
 * リフレッシュトークンを無効化
 */
export async function revokeRefreshToken(token: string): Promise<boolean> {
  try {
    const hashedToken = hashString(token);
    await prisma.refreshToken.delete({
      where: { token: hashedToken },
    });
    return true;
  } catch (error) {
    return false;
  }
}

// ===== ユーザー同意関連クエリ =====

/**
 * ユーザー同意を取得
 */
export async function findUserConsent(userId: string, clientId: string) {
  return prisma.userConsent.findUnique({
    where: {
      userId_clientId: {
        userId,
        clientId,
      },
    },
  });
}

/**
 * ユーザー同意を作成または更新
 */
export async function upsertUserConsent(data: {
  userId: string;
  clientId: string;
  grantedScope: string;
}) {
  return prisma.userConsent.upsert({
    where: {
      userId_clientId: {
        userId: data.userId,
        clientId: data.clientId,
      },
    },
    create: data,
    update: {
      grantedScope: data.grantedScope,
      updatedAt: new Date(),
    },
  });
}

/**
 * ユーザー同意を削除
 */
export async function revokeUserConsent(
  userId: string,
  clientId: string,
): Promise<boolean> {
  try {
    await prisma.userConsent.delete({
      where: {
        userId_clientId: {
          userId,
          clientId,
        },
      },
    });
    return true;
  } catch (error) {
    return false;
  }
}

// ===== クリーンアップ関数 =====

/**
 * 期限切れトークンを削除
 */
export async function cleanupExpiredTokens() {
  const now = new Date();

  // 期限切れの認可コードを削除
  await prisma.authorizationCode.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });

  // 期限切れのアクセストークンを削除
  await prisma.accessToken.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });

  // 期限切れのリフレッシュトークンを削除
  await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });
}

// ===== スコープ関連ユーティリティ =====

/**
 * スコープが許可されているかチェック
 */
export function isValidScope(
  requestedScope: string,
  allowedScope: string,
): boolean {
  if (!requestedScope) return true;
  if (!allowedScope) return false;

  const requestedScopes = requestedScope.split(' ');
  const allowedScopes = allowedScope.split(' ');

  return requestedScopes.every((scope) => allowedScopes.includes(scope));
}

/**
 * スコープをマージ
 */
export function mergeScopes(
  scope1?: string,
  scope2?: string,
): string | undefined {
  if (!scope1 && !scope2) return undefined;
  if (!scope1) return scope2;
  if (!scope2) return scope1;

  const scopes1 = scope1.split(' ');
  const scopes2 = scope2.split(' ');
  const mergedScopes = [...new Set([...scopes1, ...scopes2])];

  return mergedScopes.join(' ');
}

// ===== 統計・監視用クエリ =====

/**
 * クライアント別のアクティブトークン数を取得
 */
export async function getActiveTokensCount(clientId?: string) {
  const now = new Date();

  return prisma.accessToken.count({
    where: {
      ...(clientId && { clientId }),
      expiresAt: {
        gt: now,
      },
    },
  });
}

/**
 * ユーザー別のアクティブトークン数を取得
 */
export async function getUserActiveTokensCount(userId: string) {
  const now = new Date();

  return prisma.accessToken.count({
    where: {
      userId,
      expiresAt: {
        gt: now,
      },
    },
  });
}

// ===== SNS認証関連クエリ =====

/**
 * 認証ステートを作成
 */
export async function createAuthState(data: {
  stateCode: string;
  oneTimeToken: string;
  provider: string;
  callbackUrl: string;
  expiresAt: Date;
  userId?: string;
  codeVerifier?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}) {
  return prisma.authState.create({
    data,
  });
}

/**
 * 認証ステートを取得
 */
export async function findAuthState(stateCode: string) {
  return prisma.authState.findUnique({
    where: { stateCode },
  });
}

/**
 * 認証ステートを消費（使用済みにする）
 */
export async function consumeAuthState(stateCode: string) {
  return prisma.authState.update({
    where: { stateCode },
    data: { used: true },
  });
}

/**
 * 認証ステートにユーザーIDを設定
 */
export async function updateAuthStateWithUser(
  stateCode: string,
  userId: string,
) {
  return prisma.authState.update({
    where: { stateCode },
    data: { userId },
  });
}

/**
 * ワンタイムトークンで認証ステートを取得
 */
export async function findAuthStateByToken(oneTimeToken: string) {
  return prisma.authState.findUnique({
    where: { oneTimeToken },
  });
}

/**
 * 期限切れの認証ステートを削除
 */
export async function cleanupExpiredAuthStates() {
  return prisma.authState.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { used: true }],
    },
  });
}

/**
 * ExtraProfileを作成または更新
 */
export async function upsertExtraProfile(data: {
  userId: string;
  provider: string;
  providerId: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  rawProfile: any;
}) {
  return prisma.extraProfile.upsert({
    where: {
      providerId_provider: {
        providerId: data.providerId,
        provider: data.provider,
      },
    },
    create: data,
    update: {
      displayName: data.displayName,
      email: data.email,
      avatarUrl: data.avatarUrl,
      rawProfile: data.rawProfile,
    },
  });
}

/**
 * プロバイダーIDでExtraProfileを取得
 */
export async function findExtraProfileByProvider(
  providerId: string,
  provider: string,
) {
  return prisma.extraProfile.findUnique({
    where: {
      providerId_provider: {
        providerId,
        provider,
      },
    },
    include: {
      user: true,
    },
  });
}

/**
 * ユーザーのプロバイダーリストに追加
 */
export async function addUserProvider(userId: string, provider: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { providers: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.providers.includes(provider)) {
    return; // Already exists
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      providers: {
        push: provider,
      },
    },
  });
}

/**
 * SNSユーザーを作成（パスワード不要）
 */
export async function createSnsUser(data: {
  username: string;
  email: string;
  provider: string;
}) {
  return prisma.user.create({
    data: {
      username: data.username,
      email: data.email,
      providers: [data.provider],
    },
  });
}

/**
 * プロバイダー別ユーザーを検索
 */
export async function findUserByProvider(providerId: string, provider: string) {
  const extraProfile = await prisma.extraProfile.findUnique({
    where: {
      providerId_provider: {
        providerId,
        provider,
      },
    },
    include: {
      user: true,
    },
  });

  return extraProfile?.user || null;
}

// ===== パスワードリセット関連クエリ =====

/**
 * 6桁のランダムコード生成
 */
export function generateResetCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * パスワードリセット用のコードを作成
 */
export async function createPasswordReset(userId: string) {
  // 既存の未使用のリセットコードを削除
  await prisma.passwordReset.deleteMany({
    where: {
      userId,
      used: false,
    },
  });

  const resetCode = generateResetCode();
  const hashedResetCode = await bcrypt.hash(resetCode, 12);

  const passwordReset = await prisma.passwordReset.create({
    data: {
      userId,
      resetCode: hashedResetCode,
      expiresAt: calculateExpiration(30), // 30分間有効
    },
  });

  return {
    id: passwordReset.id,
    resetCode, // 元のコードを返す（ハッシュ化前）
    expiresAt: passwordReset.expiresAt,
  };
}

/**
 * リセットコードを検証して取得
 */
export async function findValidPasswordReset(resetCode: string) {
  // 全ての未使用で有効期限内のパスワードリセットレコードを取得
  const passwordResets = await prisma.passwordReset.findMany({
    where: {
      used: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: { user: true },
  });

  // 各レコードのハッシュ化されたリセットコードと入力されたコードを比較
  for (const passwordReset of passwordResets) {
    const isValid = await bcrypt.compare(resetCode, passwordReset.resetCode);
    if (isValid) {
      return passwordReset;
    }
  }

  return null;
}

/**
 * リセットコードを使用済みにマーク
 */
export async function markPasswordResetAsUsed(passwordResetId: string) {
  return prisma.passwordReset.update({
    where: { id: passwordResetId },
    data: { used: true },
  });
}

/**
 * ユーザーのパスワードを更新
 */
export async function updateUserPassword(userId: string, newPassword: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: hashString(newPassword),
    },
    select: {
      id: true,
      username: true,
      email: true,
      updatedAt: true,
    },
  });
}

/**
 * 期限切れのパスワードリセットコードを削除
 */
export async function cleanupExpiredPasswordResets() {
  const result = await prisma.passwordReset.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}

export default prisma;

// ===== JWT状態管理関連クエリ =====

export async function createJWTState(
  userId: string,
  params?: { id?: string; revoked?: boolean },
) {
  return prisma.jWTState.create({
    data: {
      ...params,
      userId,
    },
  });
}

export async function getAllJWTState(params?: {
  userId: string;
}): Promise<JWTState[]> {
  return prisma.jWTState.findMany({
    where: {
      userId: params?.userId,
    },
  });
}

export async function getJWTStateById(
  id: string,
  params?: { userId: string },
): Promise<JWTState | null> {
  return prisma.jWTState.findFirst({
    where: {
      id,
      userId: params?.userId,
    },
  });
}

export async function updateJWTState(
  id: string,
  params: UpdateJwtStateDto,
): Promise<JWTState | null> {
  return prisma.jWTState.update({
    where: {
      id,
    },
    data: {
      ...params,
    },
  });
}

export async function deleteJWTState(id: string) {
  await prisma.jWTState.delete({
    where: {
      id,
    },
  });
}

export async function revokeJWTState(id: string): Promise<boolean> {
  try {
    await prisma.jWTState.update({
      where: { id },
      data: { revoked: true },
    });
    return true;
  } catch (error) {
    return false;
  }
}

export async function isJWTStateRevoked(id: string): Promise<boolean> {
  const jwtState = await prisma.jWTState.findUnique({
    where: { id },
  });
  return jwtState ? jwtState.revoked : true;
}

// ===== GMOコイン関連クエリ =====

/**
 * GMOコイン - ステータスを保存
 */
export async function saveGmoCoinStatus(payload: {
  status: number;
  data: any;
  responsetime: string;
}) {
  return prisma.gmoCoinStatus.create({
    data: {
      statusCode: payload.status,
      data: payload.data,
      responsetime: new Date(payload.responsetime),
    },
  });
}

/**
 * GMOコイン - ティッカー（親 + items）を保存
 */
export async function saveGmoCoinTicker(payload: {
  status: number;
  data: Array<{
    symbol: string;
    ask: string;
    bid: string;
    timestamp: string;
    status: string;
  }>;
  responsetime: string;
}) {
  return prisma.gmoCoinTicker.create({
    data: {
      statusCode: payload.status,
      responsetime: new Date(payload.responsetime),
      data: {
        create: payload.data.map((item) => ({
          symbol: item.symbol,
          ask: item.ask,
          bid: item.bid,
          timestamp: new Date(item.timestamp),
          status: item.status,
        })),
      },
    },
    include: { data: true },
  });
}

/**
 * GMOコイン - 最新のティッカーキャッシュを取得
 * Returns the most recent parent record including its child items ordered by responsetime desc
 */
export async function getLatestGmoCoinTicker() {
  return prisma.gmoCoinTicker.findFirst({
    orderBy: { responsetime: 'desc' },
    include: { data: true },
  });
}

/**
 * GMOコイン - 複数のティッカーキャッシュを取得
 * Returns the most recent parent records including their child items ordered by responsetime desc
 * @param limit optional number of parent records to return (default 10)
 */
export async function getGmoCoinTickers(limit: number = 10) {
  return prisma.gmoCoinTicker.findMany({
    orderBy: { responsetime: 'desc' },
    take: limit,
    include: { data: true },
  });
}

/**
 * GMOコイン - 最新のステータスキャッシュを取得
 */
export async function getLatestGmoCoinStatus() {
  return prisma.gmoCoinStatus.findFirst({
    orderBy: { responsetime: 'desc' },
  });
}

/**
 * GMOコイン - 最新のKLineキャッシュを取得
 */
export async function getLatestGmoCoinKline() {
  return prisma.gmoCoinKline.findFirst({
    orderBy: { responsetime: 'desc' },
    include: { data: true },
  });
}

/**
 * GMOコイン - 最新のルールキャッシュを取得
 */
export async function getLatestGmoCoinRules() {
  return prisma.gmoCoinRules.findFirst({
    orderBy: { responsetime: 'desc' },
    include: { data: true },
  });
}

/**
 * GMOコイン - KLine（親 + items）を保存
 */
export async function saveGmoCoinKline(payload: {
  status: number;
  data: Array<{
    openTime: string;
    open: string;
    high: string;
    low: string;
    close: string;
  }>;
  responsetime: string;
}) {
  return prisma.gmoCoinKline.create({
    data: {
      statusCode: payload.status,
      responsetime: new Date(payload.responsetime),
      data: {
        create: payload.data.map((item) => ({
          openTime: new Date(item.openTime),
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        })),
      },
    },
    include: { data: true },
  });
}

/**
 * GMOコイン - 取引ルール（親 + items）を保存
 */
export async function saveGmoCoinRules(payload: {
  status: number;
  data: Array<{
    symbol: string;
    tickSize: string;
    minOpenOrderSize: string;
    maxOrderSize: string;
    sizeStep: string;
  }>;
  responsetime: string;
}) {
  return prisma.gmoCoinRules.create({
    data: {
      statusCode: payload.status,
      responsetime: new Date(payload.responsetime),
      data: {
        create: payload.data.map((item) => ({
          symbol: item.symbol,
          tickSize: item.tickSize,
          minOpenOrderSize: item.minOpenOrderSize,
          maxOrderSize: item.maxOrderSize,
          sizeStep: item.sizeStep,
        })),
      },
    },
    include: { data: true },
  });
}

// ===== ExternalProviderAccessToken =====

/**
 * 外部プロバイダーのアクセストークンを保存
 */
export async function createExternalProviderAccessToken(data: unknown) {
  const parsed = ExternalProviderAccessTokenCreateSchema.parse(data);

  return prisma.externalProviderAccessToken.create({
    data: {
      userId: parsed.userId,
      encryptedToken: parsed.encryptedToken,
      provider: parsed.provider,
    },
  });
}

/**
 * IDで外部プロバイダーのアクセストークンを取得
 */
export async function getExternalProviderAccessTokenById(id: string) {
  return prisma.externalProviderAccessToken.findUnique({ where: { id } });
}

/**
 * ユーザーIDで外部プロバイダーのアクセストークンを取得
 */
export async function getExternalProviderAccessTokensByUserId(userId: string) {
  return prisma.externalProviderAccessToken.findMany({ where: { userId } });
}

/**
 * 外部プロバイダーのアクセストークンを更新
 */
export async function updateExternalProviderAccessToken(
  id: string,
  data: unknown,
) {
  const parsed = ExternalProviderAccessTokenUpdateSchema.parse(data);

  return prisma.externalProviderAccessToken.update({
    where: { id },
    data: parsed,
  });
}

/**
 * 外部プロバイダーのアクセストークンをアップサート
 */
export async function upsertExternalProviderAccessToken(
  where: { id?: string; userId?: string; provider?: string },
  createData: unknown,
  updateData: unknown,
) {
  const parsedCreate =
    ExternalProviderAccessTokenCreateSchema.parse(createData);
  const parsedUpdate =
    ExternalProviderAccessTokenUpdateSchema.parse(updateData);

  if (where.id) {
    return prisma.externalProviderAccessToken.upsert({
      where: { id: where.id },
      create: parsedCreate,
      update: parsedUpdate,
    });
  }

  const existing = await prisma.externalProviderAccessToken.findFirst({
    where: {
      userId: where.userId,
      provider: where.provider,
    },
  });

  if (existing) {
    return prisma.externalProviderAccessToken.update({
      where: { id: existing.id },
      data: parsedUpdate,
    });
  }

  return prisma.externalProviderAccessToken.create({ data: parsedCreate });
}

/**
 * 外部プロバイダーのアクセストークンを削除
 */
export async function deleteExternalProviderAccessToken(id: string) {
  await prisma.externalProviderAccessToken.delete({ where: { id } });
  return true;
}
