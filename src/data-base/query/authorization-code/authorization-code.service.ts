import { Injectable } from '@nestjs/common';
import { UtilityService } from '../../utility/utility.service';
import { DataBaseService } from '../../data-base.service';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

@Injectable()
export class AuthorizationCodeService {
  private prisma: PrismaClient;

  constructor(
    private readonly databaseService: DataBaseService,
    private readonly utilityService: UtilityService,
  ) {
    this.prisma = this.databaseService.prisma();
  }

  /**
   * 認可コードを作成
   */
  async createAuthorizationCode(data: {
    clientId: string;
    userId: string;
    redirectUri: string;
    scope?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
  }) {
    const code = this.utilityService.generateRandomString(32); // 64文字の認可コード生成
    const hashedCode = this.utilityService.hashString(code);

    await this.prisma.authorizationCode.create({
      data: {
        code: hashedCode,
        clientId: data.clientId,
        userId: data.userId,
        redirectUri: data.redirectUri,
        scope: data.scope,
        codeChallenge: data.codeChallenge,
        codeChallengeMethod: data.codeChallengeMethod,
        expiresAt: this.utilityService.calculateExpiration(10), // 10分間有効
      },
    });

    return code; // 元のコードを返す（ハッシュ化前）
  }

  /**
   * 認可コードを取得して削除（一度のみ使用）
   */
  async consumeAuthorizationCode(code: string) {
    const hashedCode = this.utilityService.hashString(code);

    const authCode = await this.prisma.authorizationCode.findUnique({
      where: { code: hashedCode },
      include: { user: true },
    });

    if (!authCode) return null;

    // 有効期限チェック
    if (authCode.expiresAt < new Date()) {
      await this.prisma.authorizationCode.delete({
        where: { code: hashedCode },
      });
      return null;
    }

    // 認可コードを削除（一度のみ使用）
    await this.prisma.authorizationCode.delete({
      where: { code: hashedCode },
    });

    return authCode;
  }

  /**
   * PKCEコードチャレンジを検証
   */
  verifyCodeChallenge(
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
}
