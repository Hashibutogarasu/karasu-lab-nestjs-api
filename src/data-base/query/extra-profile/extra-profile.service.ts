import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DataBaseService } from '../../data-base.service';

@Injectable()
export class ExtraProfileService {
  private prisma: PrismaClient;

  constructor(private readonly databaseService: DataBaseService) {
    this.prisma = this.databaseService.prisma();
  }

  /**
   * ExtraProfileを作成または更新
   */
  async upsertExtraProfile(data: {
    userId: string;
    provider: string;
    providerId: string;
    displayName?: string;
    email?: string;
    avatarUrl?: string;
    rawProfile: any;
  }) {
    return this.prisma.extraProfile.upsert({
      where: {
        providerId_provider: {
          providerId: data.providerId,
          provider: data.provider,
        },
      },
      create: data,
      update: {
        displayName: data.displayName,
        email: data.email,
        avatarUrl: data.avatarUrl,
        rawProfile: data.rawProfile,
      },
    });
  }

  /**
   * プロバイダーIDでExtraProfileを取得
   */
  async findExtraProfileByProvider(providerId: string, provider: string) {
    return this.prisma.extraProfile.findUnique({
      where: {
        providerId_provider: {
          providerId,
          provider,
        },
        linkingVerified: true,
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * プロバイダー別ユーザーを検索
   */
  async findUserByProvider(providerId: string, provider: string) {
    const extraProfile = await this.prisma.extraProfile.findUnique({
      where: {
        providerId_provider: {
          providerId,
          provider,
        },
      },
      include: {
        user: true,
      },
    });

    return extraProfile?.user || null;
  }

  async removeProfileByUser(userId: string, provider: string) {
    const extraProfile = await this.prisma.extraProfile.findFirst({
      where: {
        userId,
        provider,
      },
    });

    if (!extraProfile) {
      return null;
    }

    await this.prisma.extraProfile.delete({
      where: {
        providerId_provider: {
          providerId: extraProfile.providerId,
          provider: extraProfile.provider,
        },
        userId,
      },
    });
  }

  async getPublicUserWithExtraProfiles(userId: string) {
    return await this.prisma.extraProfile.findMany({
      where: { userId, linkingVerified: true },
    });
  }
}
