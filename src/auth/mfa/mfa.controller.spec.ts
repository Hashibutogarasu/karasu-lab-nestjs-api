import { Test, TestingModule } from '@nestjs/testing';
import { MfaController } from './mfa.controller';
import { MfaService } from '../../mfa/mfa.service';
import { AuthService } from '../auth.service';
import { AppErrorCodes } from '../../types/error-codes';

// Mock networking helpers used across tests
import { mockResponse } from '../../utils/test/mock-networking';
import { mockStatusFn, mockJsonFn } from '../../utils/test/mock-fuctions';
import { verifyJWTToken } from '../../lib';
import { TotpService } from '../../totp/totp.service';

// Mock jwt-token helpers so we can control behavior per test
jest.mock('../../lib/auth/jwt-token', () => ({
  verifyJWTToken: jest.fn(),
  generateJWTToken: jest.fn().mockResolvedValue({
    success: true,
    jwtId: 'jwt_state_123',
    token: 'mock_jwt_token',
    profile: { sub: 'user_123', name: 'u', email: 'e', providers: [] },
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  }),
  generateRefreshToken: jest.fn().mockResolvedValue({
    success: true,
    jwtId: 'jwt_state_refresh_123',
    token: 'mock_refresh_token',
    expiresAt: new Date(Date.now() + 60 * 60 * 24 * 30 * 1000),
  }),
}));

describe('MfaController (verify)', () => {
  let controller: MfaController;
  let mockMfaService: Partial<MfaService>;
  let mockAuthService: Partial<AuthService>;
  let mockTotpService: Partial<TotpService>;

  beforeEach(async () => {
    mockMfaService = {
      verifyToken: jest.fn(),
    } as Partial<MfaService>;

    mockAuthService = {
      createSession: jest.fn().mockResolvedValue({
        sessionId: 'session_abc',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }),
    } as Partial<AuthService>;

    mockTotpService = {
      generateSecret: jest.fn().mockReturnValue('SECRET'),
      generateTotpUrl: jest.fn().mockReturnValue('otpauth://test'),
      isValid: jest.fn(),
    } as Partial<TotpService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MfaController],
      providers: [
        { provide: MfaService, useValue: mockMfaService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: TotpService, useValue: mockTotpService },
        // Provide a mock cache manager so ConcurrentRequestInterceptor can be constructed
        { provide: 'CACHE_MANAGER', useValue: { set: jest.fn(), del: jest.fn() } },
      ],
    }).compile();

    controller = module.get<MfaController>(MfaController);

    jest.clearAllMocks();
    mockStatusFn.mockReturnThis();
    mockJsonFn.mockReturnThis();
  });

  it('returns normal login response when valid TOTP code is provided', async () => {
    // Arrange
    (verifyJWTToken as jest.Mock).mockResolvedValueOnce({
      success: true,
      payload: { sub: 'user_1', id: 'jwt_temp_1' },
    });
    (mockMfaService.verifyToken as jest.Mock).mockResolvedValueOnce(true);

    // Act
    await controller.verify(
      { mfaToken: 'temp_token', code: '123456' },
      mockResponse,
    );

    // Assert
    expect(verifyJWTToken).toHaveBeenCalledWith('temp_token');
    expect(mockMfaService.verifyToken).toHaveBeenCalledWith('user_1', '123456');
    expect(mockStatusFn).toHaveBeenCalledWith(200);
    expect(mockJsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'MFA verification successful',
        access_token: expect.any(String),
        refresh_token: expect.any(String),
        session_id: 'session_abc',
      }),
    );
  });

  it('accepts a backup code and returns normal login response', async () => {
    (verifyJWTToken as jest.Mock).mockResolvedValueOnce({
      success: true,
      payload: { sub: 'user_1', id: 'jwt_temp_1' },
    });
    (mockMfaService.verifyToken as jest.Mock).mockResolvedValueOnce(true);

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
    (verifyJWTToken as jest.Mock).mockResolvedValueOnce({
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
    (verifyJWTToken as jest.Mock).mockResolvedValueOnce({
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
    (verifyJWTToken as jest.Mock).mockResolvedValueOnce({
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
