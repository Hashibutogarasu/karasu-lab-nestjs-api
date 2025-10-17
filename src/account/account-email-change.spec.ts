/* eslint-disable @typescript-eslint/unbound-method */
import { TestingModule } from '@nestjs/testing';
import { getGlobalModule } from '../utils/test/global-modules';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import * as query from '../lib/database/query';
import { ResendService } from '../resend/resend.service';
import { AppErrorCodes } from '../types/error-codes';

jest.mock('../lib/database/query');

describe('Account Email Change Flow', () => {
  let service: AccountService;

  const mockResendService = {
    sendEmail: jest.fn(async function (this: void) {
      return true;
    }),
  } as unknown as ResendService;

  const mockFindUserById = query.findUserById as jest.MockedFunction<
    typeof query.findUserById
  >;
  const mockFindUserByEmail = query.findUserByEmail as jest.MockedFunction<
    typeof query.findUserByEmail
  >;
  const mockCreatePending =
    query.createPendingEmailChangeProcess as jest.MockedFunction<
      typeof query.createPendingEmailChangeProcess
    >;
  const mockFindPendingByCode = query.findPendingByCode as jest.MockedFunction<
    typeof query.findPendingByCode
  >;
  const mockMarkPendingUsed = query.markPendingAsUsed as jest.MockedFunction<
    typeof query.markPendingAsUsed
  >;
  const mockDeletePending = query.deletePendingById as jest.MockedFunction<
    typeof query.deletePendingById
  >;
  const mockUpdateUser = query.updateUser as jest.MockedFunction<
    typeof query.updateUser
  >;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await getGlobalModule({
      controllers: [AccountController],
      providers: [
        AccountService,
        { provide: ResendService, useValue: mockResendService },
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

  it('happy path: request change and verify deletes pending and updates email', async () => {
    mockFindUserById.mockResolvedValue(fakeUser as any);
    mockFindUserByEmail.mockResolvedValue(null as any);

    const pendingRecord = {
      id: 'p1',
      userId: 'user_1',
      newEmail: 'new@example.com',
      verificationCode: '123456', // returned plaintext by createPending
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      used: false,
      createdAt: new Date(),
    } as any;

    mockCreatePending.mockResolvedValue(pendingRecord);

    const reqRes = await service.requestEmailChange(
      'user_1',
      'new@example.com',
    );
    expect(reqRes).toHaveProperty('message');
    expect(mockResendService.sendEmail).toHaveBeenCalled();

    // now verify
    // findPendingByCode should return record when correct code is provided
    mockFindPendingByCode.mockResolvedValue({
      ...pendingRecord,
      id: 'p1',
    });
    mockUpdateUser.mockResolvedValue({
      ...fakeUser,
      email: 'new@example.com',
    } as any);
    mockMarkPendingUsed.mockResolvedValue({} as any);
    mockDeletePending.mockResolvedValue({} as any);

    const verifyRes = await service.verifyEmailChange('user_1', '123456');
    expect(verifyRes).toHaveProperty('message');
    expect(mockUpdateUser).toHaveBeenCalledWith('user_1', {
      email: 'new@example.com',
    });
    expect(mockMarkPendingUsed).toHaveBeenCalledWith('p1');
    expect(mockDeletePending).toHaveBeenCalledWith('p1');
  });

  it('requesting email change to an email already in use should return EMAIL_ALREADY_IN_USE', async () => {
    mockFindUserById.mockResolvedValue(fakeUser as any);
    // Simulate that another user already has the new email
    mockFindUserByEmail.mockResolvedValue({
      id: 'user_2',
      email: 'taken@example.com',
    } as any);

    await expect(
      service.requestEmailChange('user_1', 'taken@example.com'),
    ).rejects.toBe(AppErrorCodes.EMAIL_ALREADY_IN_USE);
  });

  it('invalid code returns bad request', async () => {
    mockFindUserById.mockResolvedValue(fakeUser as any);
    mockFindPendingByCode.mockResolvedValue(null as any);

    await expect(service.verifyEmailChange('user_1', '000000')).rejects.toBe(
      AppErrorCodes.INVALID_REQUEST,
    );
  });

  it('code for another user should be rejected', async () => {
    mockFindUserById.mockResolvedValue(fakeUser as any);
    // findPendingByCode returns a record but for different user id -> function should have searched by userId so null
    mockFindPendingByCode.mockResolvedValue(null as any);

    await expect(service.verifyEmailChange('user_1', '999999')).rejects.toBe(
      AppErrorCodes.INVALID_REQUEST,
    );
  });

  it('wrong length codes (5 or 7 digits) are rejected', async () => {
    mockFindUserById.mockResolvedValue(fakeUser as any);
    await expect(service.verifyEmailChange('user_1', '12345')).rejects.toBe(
      AppErrorCodes.INVALID_REQUEST,
    );
    await expect(service.verifyEmailChange('user_1', '1234567')).rejects.toBe(
      AppErrorCodes.INVALID_REQUEST,
    );
  });

  it('expired code is rejected', async () => {
    mockFindUserById.mockResolvedValue(fakeUser as any);
    mockFindPendingByCode.mockResolvedValue(null as any);
    // service.findPendingByCode internally checks expiry; our mock returns null to indicate invalid
    await expect(service.verifyEmailChange('user_1', '111111')).rejects.toBe(
      AppErrorCodes.INVALID_REQUEST,
    );
  });

  it('concurrent pending request: second request should be rejected', async () => {
    mockFindUserById.mockResolvedValue(fakeUser as any);
    // Simulate createPending returning a record, but if there's already one, createPendingEmailChangeProcess may still create; we should check behavior: we'll simulate that function throws
    mockCreatePending.mockRejectedValue(AppErrorCodes.ALREADY_PENDING);

    await expect(
      service.requestEmailChange('user_1', 'another@example.com'),
    ).rejects.toThrow();
  });

  it('unauthenticated user cannot verify (simulate missing user)', async () => {
    mockFindUserById.mockResolvedValue(null as any);
    await expect(service.verifyEmailChange('no_user', '123456')).rejects.toBe(
      AppErrorCodes.USER_NOT_FOUND,
    );
  });
});
