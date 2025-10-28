import { Test, TestingModule } from '@nestjs/testing';
import { MfaController } from './mfa.controller';
import { AuthService } from '../auth.service';
import { AppErrorCodes } from '../../types/error-codes';
import { mockResponse } from '../../utils/test/mock-networking';
import { mockStatusFn, mockJsonFn } from '../../utils/test/mock-fuctions';
import { TotpService } from '../../totp/totp.service';
import { MfaService } from '../../data-base/query/mfa/mfa.service';
import { mock } from 'jest-mock-extended';
import { JwtTokenService } from '../jwt-token/jwt-token.service';
import { EncryptionService } from '../../encryption/encryption.service';

describe('MfaController (verify)', () => {
  let controller: MfaController;
  let mockMfaService: MfaService;
  let mockAuthService: AuthService;
  let mockTotpService: TotpService;
  let mockJwtTokenService: JwtTokenService;
  let mockEncryptionService: EncryptionService;

  beforeEach(async () => {
    mockMfaService = mock<MfaService>({
      getUserOtpById: jest.fn().mockResolvedValue({
        id: 'otp_1',
        userId: 'user_1',
        secret: 'encrypted_secret',
        setupCompleted: true,
        backupCodes: [],
      }),
      getUserOtpByUserId: jest.fn().mockResolvedValue({
        id: 'otp_1',
        userId: 'user_1',
        secret: 'encrypted_secret',
        setupCompleted: true,
        backupCodes: [],
      }),
      setLastAuthenticatedAt: jest.fn(),
      setSetupCompleted: jest.fn(),
      findBackupCode: jest.fn().mockResolvedValue(null),
      deleteBackupCodeById: jest.fn(),
      userHasOtpEnabled: jest.fn().mockResolvedValue(true),
    });

    mockAuthService = mock<AuthService>();

    mockTotpService = mock<TotpService>({
      generateSecret: jest.fn().mockReturnValue('SECRET'),
      generateTotpUrl: jest.fn().mockReturnValue('otpauth://test'),
      isValid: jest.fn().mockRejectedValue(false),
    });

    mockJwtTokenService = mock<JwtTokenService>({
      generateJWTToken: jest.fn().mockResolvedValue({
        success: true,
        token: 'access_token',
        jwtId: 'jwt_id',
        profile: {},
      }),
      generateRefreshToken: jest.fn().mockResolvedValue({
        success: true,
        token: 'refresh_token',
      }),
    });
    mockEncryptionService = mock<EncryptionService>({
      decrypt: jest.fn().mockImplementation((secret) => {
        if (secret === 'encrypted_secret') return 'TOTP_SECRET';
        return secret;
      }),
      encrypt: jest.fn().mockImplementation((plain) => `encrypted_${plain}`),
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MfaController],
      providers: [
        { provide: MfaService, useValue: mockMfaService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: TotpService, useValue: mockTotpService },
        {
          provide: 'CACHE_MANAGER',
          useValue: { set: jest.fn(), del: jest.fn() },
        },
        { provide: JwtTokenService, useValue: mockJwtTokenService },
        { provide: EncryptionService, useValue: mockEncryptionService },
      ],
    }).compile();

    controller = module.get<MfaController>(MfaController);

    jest.clearAllMocks();
    mockStatusFn.mockReturnThis();
    mockJsonFn.mockReturnThis();
  });

  it('returns normal login response when valid TOTP code is provided', async () => {
    (mockTotpService.isValid as jest.Mock).mockReturnValue(true);
    (mockJwtTokenService.verifyJWTToken as jest.Mock).mockResolvedValueOnce({
      success: true,
      payload: { sub: 'user_1', id: 'jwt_temp_1' },
    });
    (mockMfaService.verifyToken as jest.Mock).mockImplementation(async () => {
      await mockMfaService.setLastAuthenticatedAt('otp_1', new Date());
      await mockMfaService.setSetupCompleted('otp_1', true);
      return true;
    });

    await controller.verify(
      { mfaToken: 'temp_token', code: '123456' },
      mockResponse,
    );

    expect(mockJwtTokenService.verifyJWTToken).toHaveBeenCalledWith(
      'temp_token',
    );
    expect(mockMfaService.verifyToken).toHaveBeenCalledWith('user_1', '123456');
    expect(mockStatusFn).toHaveBeenCalledWith(200);
    expect(mockJsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'MFA verification successful',
        access_token: expect.any(String),
        refresh_token: expect.any(String),
      }),
    );
  });

  it('accepts a backup code and returns normal login response', async () => {
    (mockTotpService.isValid as jest.Mock).mockReturnValue(true);
    (mockJwtTokenService.verifyJWTToken as jest.Mock).mockResolvedValueOnce({
      success: true,
      payload: { sub: 'user_1', id: 'jwt_temp_1' },
    });
    (mockMfaService.verifyToken as jest.Mock).mockImplementation(async () => {
      await mockMfaService.setLastAuthenticatedAt('otp_1', new Date());
      await mockMfaService.setSetupCompleted('otp_1', true);
      return true;
    });

    await controller.verify(
      { mfaToken: 'temp_token', code: 'BACKUPCODE' },
      mockResponse,
    );

    expect(mockMfaService.verifyToken).toHaveBeenCalledWith(
      'user_1',
      'BACKUPCODE',
    );
    expect(mockStatusFn).toHaveBeenCalledWith(200);
  });

  it('returns MFA_NOT_ENABLED if target user has no MFA configured', async () => {
    (mockJwtTokenService.verifyJWTToken as jest.Mock).mockResolvedValueOnce({
      success: true,
      payload: { sub: 'user_2', id: 'jwt_temp_2' },
    });
    (mockMfaService.verifyToken as jest.Mock).mockRejectedValueOnce(
      AppErrorCodes.MFA_NOT_ENABLED,
    );

    await expect(
      controller.verify(
        { mfaToken: 'temp_token', code: '123456' },
        mockResponse,
      ),
    ).rejects.toThrow(AppErrorCodes.MFA_NOT_ENABLED);
  });

  it('returns INVALID_TOKEN when temporary token is expired or invalid', async () => {
    (mockJwtTokenService.verifyJWTToken as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'token_expired',
    });

    await expect(
      controller.verify(
        { mfaToken: 'expired_token', code: '123456' },
        mockResponse,
      ),
    ).rejects.toThrow(AppErrorCodes.INVALID_TOKEN);
  });

  it('returns INVALID_DIGIT_CODE when an incorrect 6-digit code is provided', async () => {
    (mockJwtTokenService.verifyJWTToken as jest.Mock).mockResolvedValueOnce({
      success: true,
      payload: { sub: 'user_3', id: 'jwt_temp_3' },
    });
    (mockMfaService.verifyToken as jest.Mock).mockRejectedValueOnce(
      AppErrorCodes.INVALID_DIGIT_CODE,
    );

    await expect(
      controller.verify(
        { mfaToken: 'temp_token', code: '000000' },
        mockResponse,
      ),
    ).rejects.toThrow(AppErrorCodes.INVALID_DIGIT_CODE);
  });
});
