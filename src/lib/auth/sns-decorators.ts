/**
 * SNS認証用のデコレーター
 */

import { SetMetadata } from '@nestjs/common';

export const SNS_PROVIDER_METADATA = 'snsProvider';

/**
 * Google OAuth認証デコレーター
 */
export const Google = () => SetMetadata(SNS_PROVIDER_METADATA, 'google');

/**
 * X (Twitter) OAuth認証デコレーター（将来の実装用）
 */
export const X = () => SetMetadata(SNS_PROVIDER_METADATA, 'x');

/**
 * Discord OAuth認証デコレーター
 * @param scopes Discord OAuth スコープの配列（デフォルト: ['identify']）
 */
export const Discord = (scopes: string[] = ['identify']) =>
  SetMetadata(SNS_PROVIDER_METADATA, { provider: 'discord', scopes });

/**
 * SNSプロバイダー情報を取得するヘルパー
 */
export function getSnsProvider(target: any): string | undefined {
  return Reflect.getMetadata(SNS_PROVIDER_METADATA, target);
}
