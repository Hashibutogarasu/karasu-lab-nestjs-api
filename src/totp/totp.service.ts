import { Injectable } from '@nestjs/common';
import { totp, authenticator } from 'otplib';
import z from 'zod';
import { AppErrorCodes } from '../types/error-codes';

@Injectable()
export class TotpService {
  constructor() {}

  generateSecret(): string {
    return authenticator.generateSecret();
  }

  generateToken(secret: string): string {
    return totp.generate(secret);
  }

  generateTotpUrl(label: string, issuer: string, secret: string): string {
    return authenticator.keyuri(label, issuer, secret);
  }

  isValid(token: string, secret: string): boolean {
    const codeSchema = z.string().regex(/^\d{6}$/);
    const parseResult = codeSchema.safeParse(token);
    if (!parseResult.success) {
      throw AppErrorCodes.INVALID_DIGIT_CODE;
    }
    const result = totp.check(token, secret);
    if (result) {
      return true;
    } else {
      throw AppErrorCodes.INVALID_DIGIT_CODE;
    }
  }
}
