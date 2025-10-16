import { calculateExpiration, generateRandomString } from '..';
import prisma from './query';

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
