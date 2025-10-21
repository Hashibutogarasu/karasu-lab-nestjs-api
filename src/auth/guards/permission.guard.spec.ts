import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { PermissionType } from '../../types/permission';
import { PermissionBitcalcService } from '../../permission-bitcalc/permission-bitcalc.service';
import * as query from '../../lib/database/query';
import { AppErrorCodes } from '../../types/error-codes';
import { mock } from 'jest-mock-extended';
import { UserService } from '../../data-base/query/user/user.service';
import { PERMISSION_METAKEY } from '../permission.constants';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let bitcalc: PermissionBitcalcService;
  let reflector: Reflector & { get: jest.Mock };
  let mockUserService: UserService;

  beforeEach(() => {
    mockUserService = mock<UserService>();
    bitcalc = new PermissionBitcalcService();
    reflector = { get: jest.fn() } as unknown as Reflector & { get: jest.Mock };
    guard = new PermissionGuard(reflector, bitcalc, mockUserService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('rejects when user lacks required permissions', async () => {
    const handler = () => undefined;
    Reflect.defineMetadata(
      PERMISSION_METAKEY,
      [PermissionType.USER_WRITE],
      handler,
    );

    reflector.get.mockReturnValueOnce([PermissionType.USER_WRITE]);

    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'user-1' } }) }),
      getHandler: () => handler,
    } as unknown as ExecutionContext;

    (mockUserService.findUserById as jest.Mock).mockResolvedValue({
      id: 'user-1',
      roles: [],
    });

    await expect(guard.canActivate(ctx)).rejects.toBe(AppErrorCodes.FORBIDDEN);
  });

  it('rejects when user has required permissions', async () => {
    const handler = () => undefined;
    Reflect.defineMetadata(
      PERMISSION_METAKEY,
      [PermissionType.USER_READ],
      handler,
    );
    reflector.get.mockReturnValueOnce([PermissionType.USER_READ]);

    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'user-2' } }) }),
      getHandler: () => handler,
    } as unknown as ExecutionContext;

    // user has USER_READ and ADMIN_WRITE
    (mockUserService.findUserById as jest.Mock).mockResolvedValue({
      id: 'user-2',
      roles: [],
    });

    await expect(guard.canActivate(ctx)).rejects.toBe(AppErrorCodes.FORBIDDEN);
  });
});
