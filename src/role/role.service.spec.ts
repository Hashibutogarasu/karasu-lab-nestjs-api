import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from './role.service';
import * as db from '../lib/database/query';
import { PermissionBitcalcService } from '../permission-bitcalc/permission-bitcalc.service';
import { RoleDefinitions } from '../types/roles';

describe('RoleService', () => {
  let service: RoleService;

  beforeEach(async () => {
    jest.spyOn(db, 'findRoleByName').mockReset();
    jest.spyOn(db, 'upsertRoleByName').mockReset();
    jest.spyOn(db, 'findAllRoles').mockReset();
    jest.spyOn(db, 'deleteRole').mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleService, PermissionBitcalcService],
    }).compile();

    service = module.get<RoleService>(RoleService);
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
});
