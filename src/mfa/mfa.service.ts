import { Global, Injectable } from '@nestjs/common';
import { EncryptionService } from '../encryption/encryption.service';
import { TotpService } from '../totp/totp.service';
import {
  createUserOtp,
  getUserOtpByUserId,
  setLastAuthenticatedAt,
  createBackupCodes,
  setSetupCompleted,
  findBackupCode,
  deleteBackupCodesForUserOtp,
  deleteBackupCodeById,
  deleteUserOtpById,
  userHasOtpEnabled,
} from '../lib/database/mfa-query';
import { generateBackupCode } from '../lib/database/utility-functions';
import { AppErrorCodes } from '../types/error-codes';
import { UserOTP } from '@prisma/client';

@Injectable()
@Global()
export class MfaService {
  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly totpService: TotpService,
  ) {}

  async checkMfaRequired(userId: string) {
    const has = await userHasOtpEnabled(userId);
    if (has) {
      return { mfaRequired: true };
    }
    return { mfaRequired: false };
  }

  async setupTotpForUser(userId: string, issuerId: string, rawSecret: string) {
    if (!rawSecret) throw AppErrorCodes.MISSING_PLAIN_TEXT;

    const already = await userHasOtpEnabled(userId);
    if (already) throw AppErrorCodes.TOTP_ALREADY_ENABLED;

    const encrypted = this.encryptionService.encrypt(rawSecret);

    let rec: UserOTP;
    try {
      rec = await createUserOtp({
        userId,
        issuerId,
        secretEncrypted: encrypted,
      });
    } catch (err: any) {
      if (err && err.code === 'P2002') {
        try {
          const existing = await getUserOtpByUserId(userId);
          if (existing && existing.setupCompleted === false) {
            await deleteUserOtpById(existing.id);
            throw new Error('PARTIAL_USEROTP_CLEARED');
          }
        } catch (e) {
          // ignore errors
        }

        throw AppErrorCodes.TOTP_SIMULTANEOUS_SETUP;
      }

      const nowHas = await userHasOtpEnabled(userId);
      if (nowHas) throw AppErrorCodes.TOTP_SIMULTANEOUS_SETUP;
      throw err;
    }

    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const c = generateBackupCode(6);
      codes.push(c);
    }

    await createBackupCodes(rec.id, codes);

    await setSetupCompleted(rec.id, true);

    return { userOtp: rec, backupCodes: codes };
  }

  async verifyToken(userId: string, token: string) {
    const rec = await getUserOtpByUserId(userId);
    if (!rec) throw AppErrorCodes.MFA_NOT_ENABLED;

    const secretEncrypted = rec.secret;
    const secret = this.encryptionService.decrypt(secretEncrypted);

    const ok = this.totpService.isValid(token, secret);
    if (ok) {
      await setLastAuthenticatedAt(rec.id, new Date());
      await setSetupCompleted(rec.id, true);
      return true;
    }

    const backup = await findBackupCode(rec.id, token);
    if (backup) {
      await deleteBackupCodeById(backup.id);
      await setLastAuthenticatedAt(rec.id, new Date());
      return true;
    }

    throw AppErrorCodes.INVALID_DIGIT_CODE;
  }

  async regenerateBackupCodesForUser(userId: string) {
    const rec = await getUserOtpByUserId(userId);
    if (!rec) throw AppErrorCodes.MFA_NOT_ENABLED;

    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const c = generateBackupCode(6);
      codes.push(c);
    }

    await deleteBackupCodesForUserOtp(rec.id);
    await createBackupCodes(rec.id, codes);

    return { userOtp: rec, backupCodes: codes };
  }

  async disableMfaForUser(userId: string) {
    const rec = await getUserOtpByUserId(userId);
    if (!rec) return { success: true };

    await deleteBackupCodesForUserOtp(rec.id);
    await deleteUserOtpById(rec.id);

    return { success: true };
  }
}
