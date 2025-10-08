import { UseGuards, applyDecorators } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DomainGuard as DomainGuardClass } from './domain.guard';

/**
 * JWT認証とドメインチェックを組み合わせたデコレーター
 * 使用例: @DomainProtected()
 */
export function DomainProtected() {
  return applyDecorators(UseGuards(JwtAuthGuard, DomainGuardClass));
}
