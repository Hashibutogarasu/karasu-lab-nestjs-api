import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from './role.service';
import * as db from '../lib/database/query';
import { PermissionBitcalcService } from '../permission-bitcalc/permission-bitcalc.service';
import { RoleDefinitions, Roles } from '../types/roles';
import { getGlobalModule } from '../utils/test/global-modules';
import { UsersService } from '../users/users.service';
import { PublicUser } from '../auth/decorators/auth-user.decorator';
import { AppErrorCodes } from '../types/error-codes';

describe('RoleService', () => {
  let service: RoleService;
  let usersService: UsersService;
  let updateUserRolesMock: jest.Mock;

  beforeEach(async () => {
    jest.spyOn(db, 'findRoleByName').mockReset();
    jest.spyOn(db, 'upsertRoleByName').mockReset();
    jest.spyOn(db, 'findAllRoles').mockReset();
    jest.spyOn(db, 'deleteRole').mockReset();

    const module: TestingModule = await getGlobalModule({
      providers: [
        RoleService,
        PermissionBitcalcService,
        {
          provide: UsersService,
          useValue: {
            findUsersByDomain: jest.fn().mockResolvedValue([]),
            updateUserRoles: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    usersService = module.get<UsersService>(UsersService);
    // capture the mock function locally to avoid referencing an unbound method
    updateUserRolesMock = (usersService as any).updateUserRoles as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.ADMIN_DOMAIN;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('skips upsert when existing role has identical bitmask', async () => {
    // Arrange: mock findRoleByName to return a role with the same bitmask
    const defs = Object.values(RoleDefinitions);

    // Return a matching existing role for each definition name
    (db.findRoleByName as jest.Mock).mockImplementation(
      async (name: string) => {
        const def = defs.find((d) => d.name === name);
        if (!def) return null;
        return {
          id: `role-${name}`,
          name: def.name,
          bitmask: new PermissionBitcalcService().encode(def.permissions),
        };
      },
    );

    (db.findAllRoles as jest.Mock).mockResolvedValue([]);

    // Act
    await service.onModuleInit();

    // Assert: upsertRoleByName should not be called because nothing changed
    expect(db.upsertRoleByName).not.toHaveBeenCalled();
  });

  it('deletes roles not present in definitions', async () => {
    const defs = Object.values(RoleDefinitions);
    const existingRoles = [
      { id: 'r1', name: defs[0].name, bitmask: 0 },
      { id: 'extra', name: 'not-in-def', bitmask: 0 },
    ];

    (db.findRoleByName as jest.Mock).mockResolvedValue(null);
    (db.upsertRoleByName as jest.Mock).mockResolvedValue(null);
    (db.findAllRoles as jest.Mock).mockResolvedValue(existingRoles);
    (db.deleteRole as jest.Mock).mockResolvedValue(null);

    await service.onModuleInit();

    expect(db.deleteRole).toHaveBeenCalledWith('extra');
  });

  describe('updateAdminUsers', () => {
    const ADMIN_DOMAIN = 'admin.com';

    beforeEach(() => {
      process.env.ADMIN_DOMAIN = ADMIN_DOMAIN;
    });

    it('should throw a permission error if a user with a non-admin domain is included', async () => {
      const users = [
        { id: '1', email: 'user1@admin.com' },
        { id: '2', email: 'user2@invalid.com' },
      ] as PublicUser[];

      await expect(service.updateAdminUsers(users)).rejects.toThrow(
        AppErrorCodes.PERMISSION_DENIED,
      );

      expect(updateUserRolesMock).not.toHaveBeenCalled();
    });

    it('should grant admin role to all users if they all have the admin domain', async () => {
      const users = [
        { id: '1', email: 'user1@admin.com' },
        { id: '2', email: 'user2@admin.com' },
      ] as PublicUser[];

      await service.updateAdminUsers(users);

      expect(updateUserRolesMock).toHaveBeenCalledTimes(2);
      expect(updateUserRolesMock).toHaveBeenCalledWith('1', [Roles.ADMIN]);
      expect(updateUserRolesMock).toHaveBeenCalledWith('2', [Roles.ADMIN]);
    });
  });
});
