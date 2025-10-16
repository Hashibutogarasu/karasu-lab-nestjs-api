import prisma from './query';

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
