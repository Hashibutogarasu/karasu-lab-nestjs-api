import prisma, { calculateExpiration, hashString } from './query';
import * as bcrypt from 'bcrypt';

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
