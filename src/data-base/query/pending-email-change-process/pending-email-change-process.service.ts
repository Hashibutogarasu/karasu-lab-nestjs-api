import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DataBaseService } from '../../data-base.service';
import { UtilityService } from '../../utility/utility.service';

@Injectable()
export class PendingEmailChangeProcessService {
  private prisma: PrismaClient;

  constructor(
    private readonly databaseService: DataBaseService,
    private readonly utilityService: UtilityService,
  ) {
    this.prisma = this.databaseService.prisma();
  }

  async createPendingEmailChangeProcess(data: {
    userId: string;
    newEmail: string;
    code?: string;
    expiresAt?: Date;
  }) {
    const verificationCode =
      data.code || Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = this.utilityService.hashString(verificationCode);
    const expiresAt =
      data.expiresAt || this.utilityService.calculateExpiration(30); // 30 minutes

    const record = await this.prisma.pendingEMailChangeProcess.create({
      data: {
        userId: data.userId,
        newEmail: data.newEmail,
        verificationCode: hashedCode,
        expiresAt,
        used: false,
      },
    });

    // Return plain verification code (not hashed) to caller so it can be emailed
    return {
      ...record,
      verificationCode: verificationCode,
    };
  }

  async findPendingByUserId(userId: string) {
    return this.prisma.pendingEMailChangeProcess.findFirst({
      where: { userId, used: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingByCode(userId: string, code: string) {
    const rec = await this.prisma.pendingEMailChangeProcess.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!rec) return null;
    // verificationCode is stored hashed (via hashString)
    const hashed = this.utilityService.hashString(code);
    if (rec.verificationCode !== hashed) return null;
    if (rec.used) return null;
    if (rec.expiresAt < new Date()) return null;
    return rec;
  }

  async markPendingAsUsed(id: string) {
    return this.prisma.pendingEMailChangeProcess.update({
      where: { id },
      data: { used: true },
    });
  }

  async deletePendingById(id: string) {
    return this.prisma.pendingEMailChangeProcess.delete({ where: { id } });
  }
}
