import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DataBaseService } from '../../data-base.service';
import { UtilityService } from '../../utility/utility.service';
import { AppErrorCodes } from '../../../types/error-codes';
import { EncryptionService } from '../../../encryption/encryption.service';
import { TotpService } from '../../../totp/totp.service';
import { DateTimeService } from '../../../date-time/date-time.service';

@Injectable()
export class MfaService {
  private prisma: PrismaClient;

  constructor(
    private readonly databaseService: DataBaseService,
    private readonly utilityService: UtilityService,
    private readonly encryptionService: EncryptionService,
    private readonly totpService: TotpService,
    private readonly dateTimeService: DateTimeService,
  ) {
    this.prisma = this.databaseService.prisma();
  }

  async createUserOtp(data: {
    userId: string;
    issuerId: string;
    secretEncrypted: string;
  }) {
    return this.prisma.userOTP.create({
      data: {
        userId: data.userId,
        issuerId: data.issuerId,
        secret: data.secretEncrypted,
        createdAt: this.dateTimeService.now(),
        updatedAt: this.dateTimeService.now(),
      },
    });
  }

  async getUserOtpByUserId(userId: string) {
    return this.prisma.userOTP.findFirst({
      where: { userId },
      include: { backupCodes: true },
    });
  }

  async getUserOtpById(id: string) {
    return this.prisma.userOTP.findUnique({
      where: { id },
      include: { backupCodes: true },
    });
  }

  async setLastAuthenticatedAt(userOtpId: string, at: Date) {
    return this.prisma.userOTP.update({
      where: { id: userOtpId },
      data: { lastAuthenticatedAt: at },
    });
  }

  async createBackupCodes(userOtpId: string, codes: string[]) {
    const createMany = codes.map((c) => ({
      userOtpId,
      hashedCode: this.utilityService.hashString(c),
      createdAt: this.dateTimeService.now(),
    }));
    return this.prisma.oTPBackupCode.createMany({ data: createMany });
  }

  async findBackupCode(userOtpId: string, plainCode: string) {
    const hashed = this.utilityService.hashString(plainCode);
    return this.prisma.oTPBackupCode.findFirst({
      where: { userOtpId, hashedCode: hashed },
    });
  }

  async deleteBackupCodesForUserOtp(userOtpId: string) {
    return this.prisma.oTPBackupCode.deleteMany({ where: { userOtpId } });
  }

  async deleteUserOtpById(id: string) {
    return this.prisma.userOTP.delete({ where: { id } });
  }

  async deleteBackupCodeById(id: string) {
    return this.prisma.oTPBackupCode.delete({ where: { id } });
  }

  async userHasOtpEnabled(userId: string) {
    const rec = await this.prisma.userOTP.findFirst({
      where: { userId, setupCompleted: true },
    });
    return rec !== null;
  }

  async setSetupCompleted(userOtpId: string, completed: boolean) {
    return this.prisma.userOTP.update({
      where: { id: userOtpId },
      data: { setupCompleted: completed },
    });
  }

  async checkMfaRequired(userId: string) {
    const has = await this.userHasOtpEnabled(userId);
    if (has) {
      return { mfaRequired: true };
    }
    return { mfaRequired: false };
  }

  async setupTotpForUser(userId: string, issuerId: string, rawSecret: string) {
    if (!rawSecret) throw AppErrorCodes.MISSING_PLAIN_TEXT;

    const encrypted = this.encryptionService.encrypt(rawSecret);

    const existing = await this.getUserOtpByUserId(userId);
    if (existing && existing.setupCompleted === false) {
      await this.deleteBackupCodesForUserOtp(existing.id);
      await this.deleteUserOtpById(existing.id);
    }

    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const c = this.utilityService.generateBackupCode(6);
      codes.push(c);
    }

    const created = await this.createUserOtp({
      userId,
      issuerId,
      secretEncrypted: encrypted,
    });

    await this.createBackupCodes(created.id, codes);
    await this.setSetupCompleted(created.id, true);

    return { backupCodes: codes };
  }

  async verifyToken(userId: string, token: string) {
    const rec = await this.getUserOtpByUserId(userId);
    if (!rec) throw AppErrorCodes.MFA_NOT_ENABLED;

    const secretEncrypted = rec.secret;
    const secret = this.encryptionService.decrypt(secretEncrypted);

    const ok = this.totpService.isValid(token, secret);
    if (ok) {
      await this.setLastAuthenticatedAt(rec.id, new Date());
      await this.setSetupCompleted(rec.id, true);
      return true;
    }

    const backup = await this.findBackupCode(rec.id, token);
    if (backup) {
      await this.deleteBackupCodeById(backup.id);
      await this.setLastAuthenticatedAt(rec.id, new Date());
      return true;
    }

    throw AppErrorCodes.INVALID_DIGIT_CODE;
  }

  async regenerateBackupCodesForUser(userId: string) {
    const rec = await this.getUserOtpByUserId(userId);
    if (!rec) throw AppErrorCodes.MFA_NOT_ENABLED;

    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const c = this.utilityService.generateBackupCode(6);
      codes.push(c);
    }

    await this.deleteBackupCodesForUserOtp(rec.id);
    await this.createBackupCodes(rec.id, codes);

    return { userOtp: rec, backupCodes: codes };
  }

  async disableMfaForUser(userId: string) {
    const rec = await this.getUserOtpByUserId(userId);
    if (!rec) return { success: true };

    await this.deleteBackupCodesForUserOtp(rec.id);
    await this.deleteUserOtpById(rec.id);

    return { success: true };
  }
}
