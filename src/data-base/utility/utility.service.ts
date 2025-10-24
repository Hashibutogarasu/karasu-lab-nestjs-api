import {
  ExecutionContext,
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { createHash, randomBytes } from 'crypto';
import { DataBaseService } from '../data-base.service';
import { PrismaClient } from '@prisma/client';
import { AppErrorCodes } from '../../types/error-codes';
import { UserService } from '../query/user/user.service';
import { BaseService } from '../../impl/base-service';
import { AppConfigService } from '../../app-config/app-config.service';

@Injectable()
export class UtilityService extends BaseService {
  private prisma: PrismaClient;

  constructor(
    @Inject(forwardRef(() => DataBaseService))
    private readonly databaseService: DataBaseService,
    private readonly moduleRef: ModuleRef,
    appConfig: AppConfigService,
  ) {
    super(appConfig);
    this.prisma = this.databaseService.prisma();
  }

  /**
   * SHA256ハッシュ化
   */
  hashString(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  /**
   * ランダムな文字列生成（16進表記）
   */
  generateRandomString(length: number): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * バックアップコード（数字）の生成
   * crypto の乱数から指定桁数の 0 埋め数字文字列を返す。
   * デフォルトは 6 桁。
   */
  generateBackupCode(digits = 6): string {
    if (digits <= 0) return '';
    const max = 10 ** digits;
    // 32ビットの乱数で十分（6桁だと 1,000,000 未満なので OK）
    const n = randomBytes(4).readUInt32BE(0) % max;
    return String(n).padStart(digits, '0');
  }

  /**
   * トークンの有効期限計算
   */
  calculateExpiration(minutes: number): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  /**
   * 期限切れトークンを削除
   */
  async cleanupExpiredTokens() {
    const now = new Date();

    // 期限切れの認可コードを削除
    await this.prisma.authorizationCode.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    // 期限切れのアクセストークンを削除
    await this.prisma.accessToken.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    // 期限切れのリフレッシュトークンを削除
    await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });
  }

  /**
   * スコープが許可されているかチェック
   */
  isValidScope(requestedScope: string, allowedScope: string): boolean {
    if (!requestedScope) return true;
    if (!allowedScope) return false;

    const requestedScopes = requestedScope.split(' ');
    const allowedScopes = allowedScope.split(' ');

    return requestedScopes.every((scope) => allowedScopes.includes(scope));
  }

  /**
   * スコープをマージ
   */
  mergeScopes(scope1?: string, scope2?: string): string | undefined {
    if (!scope1 && !scope2) return undefined;
    if (!scope1) return scope2;
    if (!scope2) return scope1;

    const scopes1 = scope1.split(' ');
    const scopes2 = scope2.split(' ');
    const mergedScopes = [...new Set([...scopes1, ...scopes2])];

    return mergedScopes.join(' ');
  }

  /**
   * クライアント別のアクティブトークン数を取得
   */
  async getActiveTokensCount(clientId?: string) {
    const now = new Date();

    return this.prisma.accessToken.count({
      where: {
        ...(clientId && { clientId }),
        expiresAt: {
          gt: now,
        },
      },
    });
  }

  /**
   * ユーザー別のアクティブトークン数を取得
   */
  async getUserActiveTokensCount(userId: string) {
    const now = new Date();

    return this.prisma.accessToken.count({
      where: {
        userId,
        expiresAt: {
          gt: now,
        },
      },
    });
  }

  /**
   * 認証処理の共通ヘルパー
   * JWT認証済みユーザー情報を取得し、指定したプロバイダーのプロフィールを返す
   */
  async getAuthenticatedUserProfile<T>(
    ctx: ExecutionContext,
    provider: string,
    parseProfile: (rawProfile: any) => T,
  ): Promise<T | null> {
    const request = ctx.switchToHttp().getRequest();

    if (!request.user?.id) {
      throw AppErrorCodes.UNAUTHORIZED;
    }

    const userService = this.moduleRef.get<UserService>(UserService, {
      strict: false,
    });

    if (!userService) {
      throw AppErrorCodes.USER_GET_DATABASE_ERROR;
    }

    // ユーザー情報を取得(ExtraProfileを含む)
    const user = await userService.findUserById(request.user.id);

    if (!user) {
      throw AppErrorCodes.USER_NOT_FOUND;
    }

    // 指定されたプロバイダーの ExtraProfile を検索
    const profile = user.extraProfiles?.find((p) => p.provider === provider);

    if (!profile) {
      return null;
    }

    // raw_profile をパース
    try {
      return parseProfile(profile.rawProfile);
    } catch (error) {
      throw AppErrorCodes.INVALID_PROFILE_DATA;
    }
  }
}
