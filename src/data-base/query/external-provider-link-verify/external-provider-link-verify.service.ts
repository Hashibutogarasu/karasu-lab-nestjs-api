import { Injectable } from '@nestjs/common';
import { DataBaseService } from '../../data-base.service';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UtilityService } from '../../utility/utility.service';
import { AppErrorCodes } from '../../../types/error-codes';

@Injectable()
export class ExternalProviderLinkVerifyService {
  private prisma: PrismaClient;

  constructor(
    private readonly databaseService: DataBaseService,
    private readonly utilityService: UtilityService,
  ) {
    this.prisma = this.databaseService.prisma();
  }

  async create(data: {
    userId: string;
    provider: string;
    rawExternalProviderProfile: unknown;
    expiresInMinutes?: number;
  }) {
    try {
      await this.prisma.externalProviderLinkVerify.deleteMany({
        where: {
          userId: data.userId,
          provider: data.provider,
        },
      });

      const verifyCode = this.utilityService.generateRandomString(12);
      const hashed = await bcrypt.hash(verifyCode, 12);

      const expiresAt = this.utilityService.calculateExpiration(
        data.expiresInMinutes ?? 10,
      );

      const record = await this.prisma.externalProviderLinkVerify.create({
        data: {
          userId: data.userId,
          provider: data.provider,
          rawExternalProviderProfile: data.rawExternalProviderProfile as any,
          verifyHashedCode: hashed,
          expiresAt,
        },
      });

      return {
        id: record.id,
        verifyCode,
        expiresAt: record.expiresAt,
        createdAt: record.createdAt,
      };
    } catch (err) {
      throw AppErrorCodes.EXTERNAL_PROVIDER_LINK_VERIFY_CREATE_FAILED;
    }
  }

  async verify(params: {
    userId: string;
    provider: string;
    verifyCode: string;
  }): Promise<boolean> {
    const now = new Date();

    const records = await this.prisma.externalProviderLinkVerify.findMany({
      where: {
        provider: params.provider,
        expiresAt: {
          gt: now,
        },
      },
      select: {
        id: true,
        userId: true,
        verifyHashedCode: true,
        provider: true,
      },
    });

    for (const rec of records) {
      if (rec.userId !== params.userId) continue;

      const ok = await bcrypt.compare(params.verifyCode, rec.verifyHashedCode);
      if (ok) {
        try {
          await this.markAsLinkingVerified(rec.id, rec.userId, rec.provider);
        } catch (e) {
          throw AppErrorCodes.EXTERNAL_PROVIDER_LINK_VERIFY_DELETE_FAILED;
        }
        return true;
      }
    }

    return false;
  }

  async delete(id: string) {
    if (!id) throw AppErrorCodes.EXTERNAL_PROVIDER_TOKEN_ID_REQUIRED;
    try {
      await this.prisma.externalProviderLinkVerify.delete({ where: { id } });
      return true;
    } catch (err) {
      throw AppErrorCodes.EXTERNAL_PROVIDER_LINK_VERIFY_DELETE_FAILED;
    }
  }

  async cleanupExpired(): Promise<number> {
    try {
      const result = await this.prisma.externalProviderLinkVerify.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      return result.count;
    } catch (err) {
      throw AppErrorCodes.EXTERNAL_PROVIDER_LINK_VERIFY_DELETE_FAILED;
    }
  }

  async markAsLinkingVerified(
    processId: string,
    userId: string,
    provider: string,
  ) {
    const existingVerify =
      await this.prisma.externalProviderLinkVerify.findUnique({
        where: { id: processId },
      });

    await this.prisma.externalProviderAccessToken.update({
      where: {
        id: existingVerify?.id,
      },
      data: { linkingVerified: true },
    });

    const existingExtraProfile = await this.prisma.extraProfile.findFirst({
      where: {
        userId: userId,
        provider: provider,
      },
    });

    await this.prisma.extraProfile.update({
      where: {
        id: existingExtraProfile?.id,
      },
      data: { linkingVerified: true },
    });

    await this.prisma.externalProviderLinkVerify.delete({
      where: { id: processId },
    });
  }
}
