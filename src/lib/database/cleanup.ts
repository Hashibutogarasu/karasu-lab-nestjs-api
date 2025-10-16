import prisma from './query';

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
