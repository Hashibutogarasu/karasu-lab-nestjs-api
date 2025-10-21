import { Injectable } from '@nestjs/common';
import { DataBaseService } from '../../data-base.service';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AuthStateService {
  private prisma: PrismaClient;

  constructor(private readonly databaseService: DataBaseService) {
    this.prisma = this.databaseService.prisma();
  }

  /**
   * 認証ステートを作成
   */
  async createAuthState(data: {
    stateCode: string;
    oneTimeToken: string;
    provider: string;
    callbackUrl: string;
    expiresAt: Date;
    userId?: string;
    codeVerifier?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
  }) {
    return this.prisma.authState.create({
      data,
    });
  }

  /**
   * 認証ステートを取得
   */
  async findAuthState(stateCode: string) {
    return this.prisma.authState.findUnique({
      where: { stateCode },
    });
  }

  /**
   * 認証ステートを消費（使用済みにする）
   */
  async consumeAuthState(stateCode: string) {
    return this.prisma.authState.update({
      where: { stateCode },
      data: { used: true },
    });
  }

  /**
   * 認証ステートにユーザーIDを設定
   */
  async updateAuthStateWithUser(stateCode: string, userId: string) {
    return this.prisma.authState.update({
      where: { stateCode },
      data: { userId },
    });
  }

  /**
   * ワンタイムトークンで認証ステートを取得
   */
  async findAuthStateByToken(oneTimeToken: string) {
    return this.prisma.authState.findUnique({
      where: { oneTimeToken },
    });
  }

  /**
   * 期限切れの認証ステートを削除
   */
  async cleanupExpiredAuthStates() {
    return this.prisma.authState.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { used: true }],
      },
    });
  }
}
