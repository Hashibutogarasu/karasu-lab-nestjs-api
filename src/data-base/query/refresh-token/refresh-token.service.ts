import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DataBaseService } from '../../data-base.service';
import { UtilityService } from '../../utility/utility.service';

@Injectable()
export class RefreshTokenService {
  private prisma: PrismaClient;

  constructor(
    private readonly databaseService: DataBaseService,
    private readonly utilityService: UtilityService,
  ) {
    this.prisma = this.databaseService.prisma();
  }

  /**
   * リフレッシュトークンを作成
   */
  async createRefreshToken(data: {
    accessToken: string;
    clientId: string;
    userId: string;
    scope?: string;
  }) {
    const token = this.utilityService.generateRandomString(64); // 128文字のトークン生成
    const hashedToken = this.utilityService.hashString(token);

    await this.prisma.refreshToken.create({
      data: {
        token: hashedToken,
        accessToken: data.accessToken,
        clientId: data.clientId,
        userId: data.userId,
        scope: data.scope,
        expiresAt: this.utilityService.calculateExpiration(30 * 24 * 60), // 30日間有効
      },
    });

    return token; // 元のトークンを返す（ハッシュ化前）
  }

  /**
   * リフレッシュトークンを取得して削除（ローテーション）
   */
  async consumeRefreshToken(token: string) {
    const hashedToken = this.utilityService.hashString(token);

    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!refreshToken) return null;

    // 有効期限チェック
    if (refreshToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({
        where: { token: hashedToken },
      });
      return null;
    }

    // リフレッシュトークンを削除（ローテーション）
    await this.prisma.refreshToken.delete({
      where: { token: hashedToken },
    });

    return refreshToken;
  }

  /**
   * リフレッシュトークンを無効化
   */
  async revokeRefreshToken(token: string): Promise<boolean> {
    try {
      const hashedToken = this.utilityService.hashString(token);
      await this.prisma.refreshToken.delete({
        where: { token: hashedToken },
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}
