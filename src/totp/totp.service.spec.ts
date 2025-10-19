import { Test, TestingModule } from '@nestjs/testing';
import { TotpService } from './totp.service';
import { totp, authenticator } from 'otplib';
import { AppErrorCodes } from '../types/error-codes';

describe('TotpService', () => {
  let service: TotpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TotpService],
    }).compile();

    service = module.get<TotpService>(TotpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('validates a generated 6-digit token', () => {
    const secret = authenticator.generateSecret();
    const code = totp.generate(secret);
    expect(code).toMatch(/^\d{6}$/);
    const result = service.isValid(code, secret);
    expect(result).toBe(true);
  });

  it('generates the same token as totp.generate', () => {
    const secret = authenticator.generateSecret();
    const expected = totp.generate(secret);
    const actual = service.generateToken(secret);
    expect(actual).toBe(expected);
  });

  it('generates a valid otpauth URL (authenticator keyuri)', () => {
    const label = 'test@example.com';
    const issuer = 'karasu-lab';
    const secret = authenticator.generateSecret();
    const url = service.generateTotpUrl(label, issuer, secret);
    expect(url.startsWith('otpauth://totp/')).toBe(true);
    expect(url).toContain(encodeURIComponent(label));
    expect(url).toContain('issuer=' + encodeURIComponent(issuer));
    expect(url).toContain('secret=' + secret);
  });

  it('throws INVALID_DIGIT_CODE for 5-digit code', () => {
    const secret = authenticator.generateSecret();
    const badCode = '12345';
    expect(() => service.isValid(badCode, secret)).toThrow(
      AppErrorCodes.INVALID_DIGIT_CODE,
    );
  });

  it('throws INVALID_DIGIT_CODE for 7-digit code', () => {
    const secret = authenticator.generateSecret();
    const badCode = '1234567';
    expect(() => service.isValid(badCode, secret)).toThrow(
      AppErrorCodes.INVALID_DIGIT_CODE,
    );
  });

  it('throws INVALID_DIGIT_CODE for a 6-digit but incorrect code', () => {
    const secret = authenticator.generateSecret();
    const otherSecret = authenticator.generateSecret();
    const wrongCode = totp.generate(otherSecret);
    expect(wrongCode).toMatch(/^\d{6}$/);
    expect(() => service.isValid(wrongCode, secret)).toThrow(
      AppErrorCodes.INVALID_DIGIT_CODE,
    );
  });
});
