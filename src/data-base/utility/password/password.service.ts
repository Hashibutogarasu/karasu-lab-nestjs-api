import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DataBaseService } from '../../data-base.service';
import * as bcrypt from 'bcrypt';
import { UtilityService } from '../utility.service';

@Injectable()
export class PasswordService {
  private prisma: PrismaClient;

  constructor(
    private readonly databaseService: DataBaseService,
    private readonly utilityService: UtilityService,
  ) {
    this.prisma = this.databaseService.prisma();
  }

  /**
   * 6桁のランダムコード生成
   */
  generateResetCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    return result;
  }

  /**
   * パスワードリセット用のコードを作成
   */
  async createPasswordReset(userId: string) {
    // 既存の未使用のリセットコードを削除
    await this.prisma.passwordReset.deleteMany({
      where: {
        userId,
        used: false,
      },
    });

    const resetCode = this.generateResetCode();
    const hashedResetCode = await bcrypt.hash(resetCode, 12);

    const passwordReset = await this.prisma.passwordReset.create({
      data: {
        userId,
        resetCode: hashedResetCode,
        expiresAt: this.utilityService.calculateExpiration(30), // 30分間有効
      },
    });

    return {
      id: passwordReset.id,
      resetCode, // 元のコードを返す（ハッシュ化前）
      expiresAt: passwordReset.expiresAt,
    };
  }

  /**
   * リセットコードを検証して取得
   */
  async findValidPasswordReset(resetCode: string) {
    // 全ての未使用で有効期限内のパスワードリセットレコードを取得
    const passwordResets = await this.prisma.passwordReset.findMany({
      where: {
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: { user: true },
    });

    // 各レコードのハッシュ化されたリセットコードと入力されたコードを比較
    for (const passwordReset of passwordResets) {
      const isValid = await bcrypt.compare(resetCode, passwordReset.resetCode);
      if (isValid) {
        return passwordReset;
      }
    }

    return null;
  }

  /**
   * リセットコードを使用済みにマーク
   */
  async markPasswordResetAsUsed(passwordResetId: string) {
    return this.prisma.passwordReset.update({
      where: { id: passwordResetId },
      data: { used: true },
    });
  }

  /**
   * ユーザーのパスワードを更新
   */
  async updateUserPassword(userId: string, newPassword: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: this.utilityService.hashString(newPassword),
      },
      select: {
        id: true,
        username: true,
        email: true,
        updatedAt: true,
        passwordHash: false,
      },
    });
  }

  /**
   * 期限切れのパスワードリセットコードを削除
   */
  async cleanupExpiredPasswordResets() {
    const result = await this.prisma.passwordReset.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}
