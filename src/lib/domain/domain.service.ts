import { Injectable, Inject } from '@nestjs/common';
import { DOMAIN_OPTIONS } from './domain.constants';
import type { DomainModuleOptions } from './domain.module';

@Injectable()
export class DomainService {
  constructor(
    @Inject(DOMAIN_OPTIONS)
    private readonly options: DomainModuleOptions,
  ) {}

  /**
   * メールアドレスからドメインを抽出
   */
  extractDomain(email: string): string {
    if (!email || !email.includes('@')) {
      return '';
    }
    return email.split('@')[1].toLowerCase();
  }

  /**
   * ドメインが許可リストに含まれているかチェック
   */
  isDomainAllowed(email: string): boolean {
    const domain = this.extractDomain(email);
    if (!domain) {
      return false;
    }

    return this.options.allowedDomains
      .map((d) => d.toLowerCase())
      .includes(domain);
  }

  /**
   * 許可されたドメインリストを取得
   */
  getAllowedDomains(): string[] {
    return [...this.options.allowedDomains];
  }
}
