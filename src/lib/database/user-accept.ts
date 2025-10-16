import prisma from './query';

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
