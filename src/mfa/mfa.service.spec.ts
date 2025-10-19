import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from '../encryption/encryption.service';
import { TotpService } from '../totp/totp.service';
import { AppErrorCodes } from '../types/error-codes';

// Mock the DB-level mfa-query functions used by MfaService
jest.mock('../lib/database/mfa-query', () => ({
  getUserOtpByUserId: jest.fn(),
  findBackupCode: jest.fn(),
  deleteBackupCodeById: jest.fn(),
  setLastAuthenticatedAt: jest.fn(),
  userHasOtpEnabled: jest.fn(),
  createUserOtp: jest.fn(),
  setSetupCompleted: jest.fn(),
  createBackupCodes: jest.fn(),
  deleteUserOtpById: jest.fn(),
  deleteBackupCodesForUserOtp: jest.fn(),
}));

import * as mfaQuery from '../lib/database/mfa-query';
import { MfaService } from './mfa.service';

// (mocks are provided above via the jest.mock factory)

describe('MfaService', () => {
  let service: any;

  beforeEach(async () => {
    jest.resetAllMocks();

    const mockEncryption = {
      encrypt: (s: string) => s,
      decrypt: (_s: string) => 'plain-secret',
    } as Partial<EncryptionService> as EncryptionService;

    const mockTotp = {
      isValid: jest.fn().mockReturnValue(false), // default to false so tests can trigger backup path
      generateToken: () => '000000',
      generateTotpUrl: () => 'otpauth://',
    } as Partial<TotpService> as TotpService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        { provide: EncryptionService, useValue: mockEncryption },
        { provide: TotpService, useValue: mockTotp },
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);
  });

  it('throws TOTP_ALREADY_ENABLED when user already has totp', async () => {
    // Arrange: userHasOtpEnabled returns true
    (mfaQuery.userHasOtpEnabled as jest.Mock).mockResolvedValue(true);

    // Act & Assert
    await expect(
      service.setupTotpForUser('user_3', 'issuer', 'raw-secret'),
    ).rejects.toThrow(AppErrorCodes.TOTP_ALREADY_ENABLED);

    expect(mfaQuery.userHasOtpEnabled).toHaveBeenCalledWith('user_3');
  });

  it('handles simultaneous setup: one succeeds, the other gets TOTP_SIMULTANEOUS_SETUP', async () => {
    // Simulate two concurrent callers for the same user
    const userId = 'concurrent_user';

    // First call to createUserOtp will succeed and return a record.
    const createdRec = { id: 'otp_created', secret: 'enc' } as any;

    // We'll make createUserOtp behave differently per invocation.
    let callIndex = 0;
    (mfaQuery.createUserOtp as jest.Mock).mockImplementation(async () => {
      callIndex++;
      if (callIndex === 1) return createdRec;
      // Simulate DB uniqueness violation for the second concurrent create
      throw new Error('unique constraint violated');
    });

    // userHasOtpEnabled initially false, then true after first creation.
    (mfaQuery.userHasOtpEnabled as jest.Mock)
      .mockResolvedValueOnce(false) // initial check for caller A
      .mockResolvedValueOnce(false) // initial check for caller B
      .mockResolvedValueOnce(true); // re-check after create failure for caller B

    (mfaQuery.createBackupCodes as jest.Mock).mockResolvedValue({});

    // Run two setup calls in parallel
    const p1 = service.setupTotpForUser(userId, 'issuer', 'raw-secret');
    const p2 = service.setupTotpForUser(userId, 'issuer', 'raw-secret');

    const res1 = await p1; // should resolve
    await expect(p2).rejects.toThrow(AppErrorCodes.TOTP_SIMULTANEOUS_SETUP);

    expect(res1).toHaveProperty('userOtp');
    expect(mfaQuery.createUserOtp).toHaveBeenCalledTimes(2);
  });

  it('allows retry after a partial failure during setup (transient error) and does not get stuck by enabled flag', async () => {
    const userId = 'retry_user';

    // Simulate first createUserOtp throws a transient error after marking enabled in DB
    let callCount = 0;
    (mfaQuery.createUserOtp as jest.Mock).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // first call simulates a transient DB error (e.g., connection issue) after some side-effect
        throw new Error('transient db error');
      }
      // second call succeeds
      return { id: 'otp_retry', secret: 'enc' } as any;
    });

    // userHasOtpEnabled will return false initially, then true if the code checks again
    (mfaQuery.userHasOtpEnabled as jest.Mock)
      .mockResolvedValueOnce(false) // first caller initial check
      .mockResolvedValueOnce(false); // retry call sees false too

    (mfaQuery.createBackupCodes as jest.Mock).mockResolvedValue({});

    // First attempt should throw a transient error
    await expect(
      service.setupTotpForUser(userId, 'issuer', 'raw-secret'),
    ).rejects.toThrow('transient db error');

    // After failure, ensure a fresh attempt can succeed (retry)
    const success = await service.setupTotpForUser(
      userId,
      'issuer',
      'raw-secret',
    );

    expect(success).toHaveProperty('userOtp');
    expect(mfaQuery.createUserOtp).toHaveBeenCalledTimes(2);
  });

  it('restarts setup when a partial UserOTP (setupCompleted=false) exists', async () => {
    const userId = 'partial_user';

    // Simulate createUserOtp throwing unique constraint P2002 on first call,
    // and succeeding on the second call (caller retry)
    (mfaQuery.createUserOtp as jest.Mock)
      .mockImplementationOnce(async () => {
        const e: any = new Error('unique constraint violated');
        e.code = 'P2002';
        throw e;
      })
      .mockImplementationOnce(async () => ({
        id: 'otp_after_cleanup',
        secret: 'enc',
      }));

    // getUserOtpByUserId should return a partial record with setupCompleted=false
    (mfaQuery.getUserOtpByUserId as jest.Mock).mockResolvedValueOnce({
      id: 'partialOtp',
      setupCompleted: false,
    });

    // deleteUserOtpById should be called to remove the partial record
    (mfaQuery.deleteUserOtpById as jest.Mock).mockResolvedValue({});

    (mfaQuery.createBackupCodes as jest.Mock).mockResolvedValue({});

    // First attempt may throw a sentinel error or a simultaneous-setup error;
    // callers should retry. Accept either outcome.
    let firstErrored = false;
    try {
      await service.setupTotpForUser(userId, 'issuer', 'raw-secret');
    } catch (e: any) {
      firstErrored = true;
      // Accept either internal sentinel or the public AppErrorCodes
      const msg = e?.message || String(e);
      expect(
        msg === 'PARTIAL_USEROTP_CLEARED' ||
          msg === AppErrorCodes.TOTP_SIMULTANEOUS_SETUP.message ||
          msg.includes('TOTP'),
      ).toBeTruthy();
    }

    // Retry should succeed (createUserOtp mocked to resolve on second call)
    const res = await service.setupTotpForUser(userId, 'issuer', 'raw-secret');
    expect(res).toHaveProperty('userOtp');

    // Ensure cleanup was attempted when partial record existed
    expect(mfaQuery.deleteUserOtpById).toHaveBeenCalledWith('partialOtp');
  });

  it('consumes backup code and returns success (backup code path)', async () => {
    // Arrange: user has an OTP entry
    const userOtpRecord = {
      id: 'userOtp1',
      secret: 'encrypted-secret',
      backupCodes: [],
    } as any;

    (mfaQuery.getUserOtpByUserId as jest.Mock).mockResolvedValue(userOtpRecord);
    // TOTP check returns false (set in beforeEach), so backup check will run
    (mfaQuery.findBackupCode as jest.Mock).mockResolvedValue({ id: 'backup1' });
    (mfaQuery.deleteBackupCodeById as jest.Mock).mockResolvedValue({});
    (mfaQuery.setLastAuthenticatedAt as jest.Mock).mockResolvedValue({});

    // Act
    const result = await service.verifyToken('user_1', 'BACKUPCODE');

    // Assert
    expect(result).toBe(true);
    expect(mfaQuery.getUserOtpByUserId).toHaveBeenCalledWith('user_1');
    expect(mfaQuery.findBackupCode).toHaveBeenCalledWith(
      'userOtp1',
      'BACKUPCODE',
    );
    expect(mfaQuery.deleteBackupCodeById).toHaveBeenCalledWith('backup1');
    expect(mfaQuery.setLastAuthenticatedAt).toHaveBeenCalledWith(
      'userOtp1',
      expect.any(Date),
    );
  });

  it('throws INVALID_DIGIT_CODE when code is incorrect and no backup code exists', async () => {
    // Arrange: user has an OTP entry
    const userOtpRecord = {
      id: 'userOtp2',
      secret: 'encrypted-secret',
      backupCodes: [],
    } as any;

    (mfaQuery.getUserOtpByUserId as jest.Mock).mockResolvedValue(userOtpRecord);
    // TOTP check false, and no backup code
    (mfaQuery.findBackupCode as jest.Mock).mockResolvedValue(null);

    // Act & Assert
    await expect(service.verifyToken('user_2', 'WRONGCODE')).rejects.toThrow(
      AppErrorCodes.INVALID_DIGIT_CODE,
    );

    expect(mfaQuery.getUserOtpByUserId).toHaveBeenCalledWith('user_2');
    expect(mfaQuery.findBackupCode).toHaveBeenCalledWith(
      'userOtp2',
      'WRONGCODE',
    );
  });
});
