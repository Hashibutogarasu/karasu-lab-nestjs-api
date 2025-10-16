import prisma from './query';

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
