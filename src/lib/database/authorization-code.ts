import { createHash } from 'crypto';
import { calculateExpiration, generateRandomString, hashString } from '..';
import prisma from './query';

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
