import { createHash, randomBytes } from 'crypto';

/**
 * SHA256ハッシュ化
 */
export function hashString(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * ランダムな文字列生成
 */
export function generateRandomString(length: number): string {
  return randomBytes(length).toString('hex');
}

/**
 * トークンの有効期限計算
 */
export function calculateExpiration(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
