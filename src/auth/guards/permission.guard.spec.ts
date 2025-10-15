import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { PermissionType } from '../../types/permission';
import { PermissionBitcalcService } from '../../permission-bitcalc/permission-bitcalc.service';
import * as query from '../../lib/database/query';
import { AppErrorCodes } from '../../types/error-codes';
import { PERMISSION_METAKEY } from '../decorators/permission.decorator';

jest.mock('../../lib/database/query', () => ({
  findUserById: jest.fn(),
}));

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let bitcalc: PermissionBitcalcService;
  let reflector: Reflector & { get: jest.Mock };

  beforeEach(() => {
    bitcalc = new PermissionBitcalcService();
    reflector = { get: jest.fn() } as unknown as Reflector & { get: jest.Mock };
    guard = new PermissionGuard(reflector, bitcalc);
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

    (query.findUserById as jest.Mock).mockResolvedValue({
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
    (query.findUserById as jest.Mock).mockResolvedValue({
      id: 'user-2',
      roles: [],
    });

    await expect(guard.canActivate(ctx)).rejects.toBe(AppErrorCodes.FORBIDDEN);
  });
});
