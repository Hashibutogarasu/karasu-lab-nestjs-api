import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PermissionBitcalcService } from '../permission-bitcalc/permission-bitcalc.service';
import { RoleDefinitions, Roles } from '../types/roles';
import {
  upsertRoleByName,
  findRoleByName,
  findAllRoles,
} from '../lib/database/query';
import { deleteRole } from '../lib/database/query';
import { UsersService } from '../users/users.service';

@Injectable()
export class RoleService implements OnModuleInit {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    private readonly bitcalc: PermissionBitcalcService,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Synchronizing roles with RoleDefinitions...');

      const defs = Object.values(RoleDefinitions);

      for (const def of defs) {
        const bitmask = this.bitcalc.encode(def.permissions);

        const existing = await findRoleByName(def.name);
        if (!existing || existing.bitmask !== bitmask) {
          await upsertRoleByName(def.name, {
            name: def.name,
            bitmask,
          });
          this.logger.log(`Upserted role: ${def.name} (bitmask=${bitmask})`);
        } else {
          this.logger.log(`Role already up-to-date: ${def.name}`);
        }
      }

      const existing = await findAllRoles();
      const definedNames = new Set(defs.map((d) => d.name));

      for (const r of existing) {
        if (!definedNames.has(r.name)) {
          try {
            await deleteRole(r.id);
            this.logger.log(`Deleted role not in definitions: ${r.name}`);
          } catch (e) {
            this.logger.warn(`Failed to delete role ${r.name}: ${String(e)}`);
          }
        }
      }

      this.logger.log('Role synchronization complete.');
    } catch (err) {
      this.logger.error('Error synchronizing roles', err);
    }

    this.logger.log('Adding admin role to the configured admin users...');

    const adminUsers = await this.usersService.findUsersByDomain(
      process.env.ADMIN_DOMAIN!,
    );

    this.logger.log(`Found ${adminUsers.length} admin users.`);

    for (const user of adminUsers) {
      await this.usersService.updateUserRoles(user.id, [Roles.ADMIN]);
    }

    this.logger.log('Role initialization complete.');
  }
}
