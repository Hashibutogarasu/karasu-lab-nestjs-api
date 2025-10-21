import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DataBaseService } from '../../data-base.service';
import { UtilityService } from '../../utility/utility.service';

@Injectable()
export class AccessTokenService {
  private prisma: PrismaClient;

  constructor(
    private readonly databaseService: DataBaseService,
    private readonly utilityService: UtilityService,
  ) {
    this.prisma = this.databaseService.prisma();
  }

  /**
   * アクセストークンを作成
   */
  async createAccessToken(data: {
    clientId: string;
    userId: string;
    scope?: string;
  }) {
    const token = this.utilityService.generateRandomString(64); // 128文字のトークン生成

    await this.prisma.accessToken.create({
      data: {
        token,
        clientId: data.clientId,
        userId: data.userId,
        scope: data.scope,
        expiresAt: this.utilityService.calculateExpiration(60), // 60分間有効
      },
    });

    return token;
  }

  /**
   * アクセストークンを取得（検証付き）
   */
  async findValidAccessToken(token: string) {
    const accessToken = await this.prisma.accessToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!accessToken) return null;

    // 有効期限チェック
    if (accessToken.expiresAt < new Date()) {
      await this.prisma.accessToken.delete({
        where: { token },
      });
      return null;
    }

    return accessToken;
  }

  /**
   * アクセストークンを無効化
   */
  async revokeAccessToken(token: string): Promise<boolean> {
    try {
      await this.prisma.accessToken.delete({
        where: { token },
      });
      return true;
    } catch {
      return false;
    }
  }
}
