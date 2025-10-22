import { Test, TestingModule } from '@nestjs/testing';
import { RoleController } from './role.controller';
import { getGlobalModule } from '../utils/test/global-modules';
import { AppErrorCodes } from '../types/error-codes';
import { RoleService } from '../data-base/query/role/role.service';
import { mock } from 'jest-mock-extended';
import { DataBaseService } from '../data-base/data-base.service';
import { PermissionBitcalcService } from '../permission-bitcalc/permission-bitcalc.service';
import { UtilityService } from '../data-base/utility/utility.service';
import { JwtTokenService } from '../auth/jwt-token/jwt-token.service';

describe('RoleController', () => {
  let service: RoleService;
  let controller: RoleController;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    const mockDatabaseService = mock<DataBaseService>();
    const mockPermissionbitcalcService = mock<PermissionBitcalcService>();
    const mockUtilityService = mock<UtilityService>();
    const mockJwtTokenService = mock<JwtTokenService>();
    const mockRoleService = mock<RoleService>({
      updateAdminUsers: jest.fn().mockImplementation(async (users: any[]) => {
        const adminDomain = process.env.ADMIN_DOMAIN;
        const invalid = users.find(
          (u) => u.email.split('@')[1] !== adminDomain,
        );
        if (invalid) {
          throw AppErrorCodes.PERMISSION_DENIED;
        }
        return Promise.resolve();
      }),
    });

    const module: TestingModule = await getGlobalModule({
      controllers: [RoleController],
      providers: [
        {
          provide: RoleService,
          useValue: mockRoleService,
        },
        {
          provide: DataBaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: PermissionBitcalcService,
          useValue: mockPermissionbitcalcService,
        },
        {
          provide: UtilityService,
          useValue: mockUtilityService,
        },
        {
          provide: JwtTokenService,
          useValue: mockJwtTokenService,
        },
      ],
    }).compile();

    moduleRef = module;
    controller = module.get<RoleController>(RoleController);
    service = module.get<RoleService>(RoleService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('calls RoleService.updateAdminUsers for an admin-domain user', async () => {
    const user = { id: '1', email: `admin@${process.env.ADMIN_DOMAIN}` } as any;

    await controller.requestForUpdateRoles(user);

    expect(service.updateAdminUsers).toHaveBeenCalledTimes(1);
    expect(service.updateAdminUsers).toHaveBeenCalledWith([user]);
  });

  it('propagates permission error when RoleService rejects for non-admin domain', async () => {
    const user = { id: '2', email: 'user@invalid.com' } as any;

    await expect(controller.requestForUpdateRoles(user)).rejects.toBe(
      AppErrorCodes.PERMISSION_DENIED,
    );
  });
});
