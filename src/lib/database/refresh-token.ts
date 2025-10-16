import { calculateExpiration, generateRandomString, hashString } from '..';
import prisma from './query';

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
