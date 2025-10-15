import { Test, TestingModule } from '@nestjs/testing';
import { RoleController } from './role.controller';
import { getGlobalModule } from '../utils/test/global-modules';
import { RoleService } from './role.service';
import { AppErrorCodes } from '../types/error-codes';

describe('RoleController', () => {
  let controller: RoleController;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    const module: TestingModule = await getGlobalModule({
      controllers: [RoleController],
      providers: [
        {
          provide: RoleService,
          useValue: {
            updateAdminUsers: jest.fn(),
          },
        },
      ],
    }).compile();

    moduleRef = module;
    controller = module.get<RoleController>(RoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('calls RoleService.updateAdminUsers for an admin-domain user', async () => {
    const roleService = moduleRef.get<RoleService>(RoleService) as any;
    const updateMock: jest.Mock = roleService.updateAdminUsers as jest.Mock;
    updateMock.mockResolvedValue(undefined);

    const user = { id: '1', email: 'admin@admin.com' } as any;

    await controller.requestForUpdateRoles(user);

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith([user]);
  });

  it('propagates permission error when RoleService rejects for non-admin domain', async () => {
    const roleService = moduleRef.get<RoleService>(RoleService) as any;
    const updateMock: jest.Mock = roleService.updateAdminUsers as jest.Mock;
    updateMock.mockRejectedValue(AppErrorCodes.PERMISSION_DENIED);

    const user = { id: '2', email: 'user@invalid.com' } as any;

    await expect(controller.requestForUpdateRoles(user)).rejects.toBe(
      AppErrorCodes.PERMISSION_DENIED,
    );
  });
});
