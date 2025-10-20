import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from '../encryption/encryption.service';
import { TotpService } from '../totp/totp.service';
import { AppErrorCodes } from '../types/error-codes';
import * as mfaQuery from '../lib/database/mfa-query';
import { MfaService } from './mfa.service';
import { mock } from 'jest-mock-extended';

jest.mock('../lib/database/mfa-query');

describe('MfaService', () => {
  let service: MfaService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const mockEncryption = mock<EncryptionService>({
      encrypt: (plain: string) => `enc(${plain})`,
      decrypt: (encrypted: string) =>
        encrypted.startsWith('enc(') && encrypted.endsWith(')')
          ? encrypted.slice(4, -1)
          : '',
    });
    const mockTotp = mock<TotpService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        { provide: EncryptionService, useValue: mockEncryption },
        { provide: TotpService, useValue: mockTotp },
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);
  });

  it('consumes backup code and returns success (backup code path)', async () => {
    const userOtpRecord = {
      id: 'userOtp1',
      secret: 'encrypted-secret',
      backupCodes: [],
    } as any;

    (mfaQuery.getUserOtpByUserId as jest.Mock).mockResolvedValue(userOtpRecord);
    (mfaQuery.findBackupCode as jest.Mock).mockResolvedValue({ id: 'backup1' });
    (mfaQuery.deleteBackupCodeById as jest.Mock).mockResolvedValue({});
    (mfaQuery.setLastAuthenticatedAt as jest.Mock).mockResolvedValue({});

    const result = await service.verifyToken('user_1', 'BACKUPCODE');

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
    const userOtpRecord = {
      id: 'userOtp2',
      secret: 'encrypted-secret',
      backupCodes: [],
    } as any;

    (mfaQuery.getUserOtpByUserId as jest.Mock).mockResolvedValue(userOtpRecord);
    (mfaQuery.findBackupCode as jest.Mock).mockResolvedValue(null);

    await expect(service.verifyToken('user_2', 'WRONGCODE')).rejects.toThrow(
      AppErrorCodes.INVALID_DIGIT_CODE,
    );

    expect(mfaQuery.getUserOtpByUserId).toHaveBeenCalledWith('user_2');
    expect(mfaQuery.findBackupCode).toHaveBeenCalledWith(
      'userOtp2',
      'WRONGCODE',
    );
  });

  it('restarts setup when a partial UserOTP (setupCompleted=false) exists', async () => {
    const partialUserOtp = {
      id: 'partialOtp',
      secret: 'encrypted-secret',
      setupCompleted: false,
      backupCodes: [{ id: 'oldBackup1' }],
    } as any;

    (mfaQuery.getUserOtpByUserId as jest.Mock).mockResolvedValueOnce(
      partialUserOtp,
    );

    (mfaQuery.deleteBackupCodesForUserOtp as jest.Mock).mockResolvedValue({});
    (mfaQuery.deleteUserOtpById as jest.Mock).mockResolvedValue({});

    (mfaQuery.createUserOtp as jest.Mock).mockResolvedValue({ id: 'newOtp' });
    (mfaQuery.createBackupCodes as jest.Mock).mockResolvedValue({});
    (mfaQuery.setSetupCompleted as jest.Mock).mockResolvedValue({});

    const result = await service.setupTotpForUser(
      'user_restart',
      'issuer',
      'plain-secret',
    );

    expect(result).toHaveProperty('backupCodes');
    expect(Array.isArray(result.backupCodes)).toBe(true);
    expect(mfaQuery.getUserOtpByUserId).toHaveBeenCalledWith('user_restart');
    expect(mfaQuery.deleteBackupCodesForUserOtp).toHaveBeenCalledWith(
      'partialOtp',
    );
    expect(mfaQuery.deleteUserOtpById).toHaveBeenCalledWith('partialOtp');
    expect(mfaQuery.createUserOtp).toHaveBeenCalledWith({
      userId: 'user_restart',
      issuerId: 'issuer',
      secretEncrypted: expect.any(String),
    });
    expect(mfaQuery.createBackupCodes).toHaveBeenCalledWith(
      'newOtp',
      expect.any(Array),
    );
    expect(mfaQuery.setSetupCompleted).toHaveBeenCalledWith('newOtp', true);
  });
});
