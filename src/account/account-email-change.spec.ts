import { TestingModule } from '@nestjs/testing';
import { getGlobalModule } from '../utils/test/global-modules';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { ResendService } from '../resend/resend.service';
import { AppErrorCodes } from '../types/error-codes';
import { mock } from 'jest-mock-extended';
import { UserService } from '../data-base/query/user/user.service';
import { PendingEmailChangeProcessService } from '../data-base/query/pending-email-change-process/pending-email-change-process.service';
import { PasswordService } from '../data-base/utility/password/password.service';
import { JwtTokenService } from '../auth/jwt-token/jwt-token.service';
import { mockUser } from '../utils/test/mock-data';
import { ExternalProviderAccessTokenService } from '../data-base/query/external-provider-access-token/external-provider-access-token.service';
import { ExtraProfileService } from '../data-base/query/extra-profile/extra-profile.service';

describe('Account Email Change Flow', () => {
  let service: AccountService;

  const mockResendService = mock<ResendService>();
  const mockUserService = mock<UserService>();
  const mockPendingEmailChangeService =
    mock<PendingEmailChangeProcessService>();


  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPasswordService = mock<PasswordService>();
    const mockJwtTokenService = mock<JwtTokenService>();
    const mockExternalProviderAccessTokenService =
      mock<ExternalProviderAccessTokenService>();
    const mockExtraProfileService = mock<ExtraProfileService>();

    const module: TestingModule = await getGlobalModule({
      controllers: [AccountController],
      providers: [
        AccountService,
        { provide: ResendService, useValue: mockResendService },
        { provide: UserService, useValue: mockUserService },
        {
          provide: PendingEmailChangeProcessService,
          useValue: mockPendingEmailChangeService,
        },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: JwtTokenService, useValue: mockJwtTokenService },
        {
          provide: ExternalProviderAccessTokenService,
          useValue: mockExternalProviderAccessTokenService,
        },
        {
          provide: ExtraProfileService,
          useValue: mockExtraProfileService,
        }
      ],
    }).compile();

    service = module.get<AccountService>(AccountService);
  });

  const fakeUser = {
    id: 'user_1',
    username: 'u1',
    email: 'old@example.com',
    providers: [],
    extraProfiles: [],
    roles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('request change and verify deletes pending and updates email', async () => {
    mockUserService.findUserById.mockResolvedValue(fakeUser as any);
    mockUserService.findUserByEmail.mockResolvedValue(null as any);

    const pendingRecord = {
      id: 'p1',
      userId: 'user_1',
      newEmail: 'new@example.com',
      verificationCode: '123456',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      used: false,
      createdAt: new Date(),
    } as any;

    mockPendingEmailChangeService.createPendingEmailChangeProcess.mockResolvedValue(
      pendingRecord,
    );

    const reqRes = await service.requestEmailChange(
      mockUser,
      'new@example.com',
    );
    expect(reqRes).toHaveProperty('message');
    expect(mockResendService.sendEmail).toHaveBeenCalled();

    mockPendingEmailChangeService.findPendingByCode.mockResolvedValue({
      ...pendingRecord,
      id: 'p1',
    });
    mockUserService.updateUser.mockResolvedValue({
      ...fakeUser,
      email: 'new@example.com',
    } as any);
    mockPendingEmailChangeService.markPendingAsUsed.mockResolvedValue(
      {} as any,
    );
    mockPendingEmailChangeService.deletePendingById.mockResolvedValue(
      {} as any,
    );

    const verifyRes = await service.verifyEmailChange(mockUser, '123456');
    expect(verifyRes).toHaveProperty('message');
    expect(mockUserService.updateUser).toHaveBeenCalledWith('user_123', {
      email: 'new@example.com',
    });
    expect(
      mockPendingEmailChangeService.markPendingAsUsed,
    ).toHaveBeenCalledWith('p1');
    expect(
      mockPendingEmailChangeService.deletePendingById,
    ).toHaveBeenCalledWith('p1');
  });

  it('requesting email change to an email already in use should return EMAIL_ALREADY_IN_USE', async () => {
    mockUserService.findUserById.mockResolvedValue(fakeUser as any);

    mockUserService.findUserByEmail.mockResolvedValue({
      id: 'user_2',
      email: 'taken@example.com',
    } as any);

    await expect(
      service.requestEmailChange(mockUser, 'taken@example.com'),
    ).rejects.toBe(AppErrorCodes.EMAIL_ALREADY_IN_USE);
  });

  it('invalid code returns bad request', async () => {
    mockUserService.findUserById.mockResolvedValue(fakeUser as any);
    mockPendingEmailChangeService.findPendingByCode.mockResolvedValue(
      null as any,
    );

    await expect(service.verifyEmailChange(mockUser, '000000')).rejects.toBe(
      AppErrorCodes.INVALID_REQUEST,
    );
  });

  it('code for another user should be rejected', async () => {
    mockUserService.findUserById.mockResolvedValue(fakeUser as any);

    mockPendingEmailChangeService.findPendingByCode.mockResolvedValue(
      null as any,
    );

    await expect(service.verifyEmailChange(mockUser, '999999')).rejects.toBe(
      AppErrorCodes.INVALID_REQUEST,
    );
  });

  it('wrong length codes (5 or 7 digits) are rejected', async () => {
    mockUserService.findUserById.mockResolvedValue(fakeUser as any);
    await expect(service.verifyEmailChange(mockUser, '12345')).rejects.toBe(
      AppErrorCodes.INVALID_REQUEST,
    );
    await expect(service.verifyEmailChange(mockUser, '1234567')).rejects.toBe(
      AppErrorCodes.INVALID_REQUEST,
    );
  });

  it('expired code is rejected', async () => {
    mockUserService.findUserById.mockResolvedValue(fakeUser as any);
    mockPendingEmailChangeService.findPendingByCode.mockResolvedValue(
      null as any,
    );

    await expect(service.verifyEmailChange(mockUser, '111111')).rejects.toBe(
      AppErrorCodes.INVALID_REQUEST,
    );
  });

  it('concurrent pending request: second request should be rejected', async () => {
    mockUserService.findUserById.mockResolvedValue(fakeUser as any);

    mockPendingEmailChangeService.createPendingEmailChangeProcess.mockRejectedValue(
      AppErrorCodes.ALREADY_PENDING,
    );

    await expect(
      service.requestEmailChange(mockUser, 'another@example.com'),
    ).rejects.toThrow();
  });

  it('unauthenticated user cannot verify (simulate missing user)', async () => {
    mockUserService.findUserById.mockResolvedValue(null as any);
    await expect(
      service.verifyEmailChange({ id: 'no_user' } as any, '123456'),
    ).rejects.toBe(AppErrorCodes.INVALID_REQUEST);
  });
});
