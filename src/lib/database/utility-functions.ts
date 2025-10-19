import { createHash, randomBytes } from 'crypto';

/**
 * SHA256ハッシュ化
 */
export function hashString(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * ランダムな文字列生成（16進表記）
 */
export function generateRandomString(length: number): string {
  return randomBytes(length).toString('hex');
}

/**
 * バックアップコード（数字）の生成
 * crypto の乱数から指定桁数の 0 埋め数字文字列を返す。
 * デフォルトは 6 桁。
 */
export function generateBackupCode(digits = 6): string {
  if (digits <= 0) return '';
  const max = 10 ** digits;
  // 32ビットの乱数で十分（6桁だと 1,000,000 未満なので OK）
  const n = randomBytes(4).readUInt32BE(0) % max;
  return String(n).padStart(digits, '0');
}

/**
 * トークンの有効期限計算
 */
export function calculateExpiration(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
