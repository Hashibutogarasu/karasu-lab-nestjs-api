import prisma, { hashString } from './query';

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
      secret: hashString(data.secret),
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
