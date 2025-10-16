import {
  ExternalProviderAccessTokenCreateSchema,
  ExternalProviderAccessTokenUpdateSchema,
} from '../../types/external-provider-access-token';
import prisma from './query';

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
