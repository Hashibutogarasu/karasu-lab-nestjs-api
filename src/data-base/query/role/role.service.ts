import { Injectable, Logger } from '@nestjs/common';
import { DataBaseService } from '../../data-base.service';
import { PrismaClient } from '@prisma/client';
import { AppErrorCodes } from '../../../types/error-codes';
import { PublicUser } from '../../../auth/decorators/auth-user.decorator';
import { RoleDefinitions, Roles } from '../../../types/roles';
import { PermissionType, PermissionScopes } from '../../../types/permission';
import { PermissionBitcalcService } from '../../../permission-bitcalc/permission-bitcalc.service';

@Injectable()
export class RoleService {
  private prisma: PrismaClient;

  constructor(
    private readonly databaseService: DataBaseService,
    private readonly permissionBitCalcService: PermissionBitcalcService,
  ) {
    this.prisma = this.databaseService.prisma();
    this.logger = new Logger(RoleService.name);
  }

  private readonly logger: Logger;

  async findAllRoles() {
    return this.prisma.role.findMany();
  }

  async findRoleByName(name: string) {
    return this.prisma.role.findUnique({
      where: { name },
    });
  }

  async findRoleById(id: string) {
    return this.prisma.role.findUnique({
      where: { id },
    });
  }

  async createRole(name: string, bitmask: number) {
    return this.prisma.role.create({
      data: {
        name,
        bitmask,
      },
    });
  }

  async deleteRole(id: string) {
    await this.prisma.role.delete({
      where: {
        id,
      },
    });
  }

  async upsertRoleByName(
    name: string,
    options: { name: string; description?: string; bitmask: number },
  ) {
    return await this.prisma.role.upsert({
      where: {
        name,
      },
      create: {
        name,
        description: options.description,
        bitmask: options.bitmask,
      },
      update: {
        name,
        description: options.description,
        bitmask: options.bitmask,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Synchronizing roles with RoleDefinitions...');

      const defs = Object.values(RoleDefinitions);

      for (const def of defs) {
        const bitmask = this.permissionBitCalcService.encode(def.permissions);

        const existing = await this.findRoleByName(def.name);
        if (!existing || existing.bitmask !== bitmask) {
          await this.upsertRoleByName(def.name, {
            name: def.name,
            bitmask,
          });
          this.logger.log(`Upserted role: ${def.name} (bitmask=${bitmask})`);
        } else {
          this.logger.log(`Role already up-to-date: ${def.name}`);
        }
      }

      const existing = await this.findAllRoles();
      const definedNames = new Set(defs.map((d) => d.name));

      for (const r of existing) {
        if (!definedNames.has(r.name)) {
          try {
            await this.deleteRole(r.id);
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

    const adminDomain = process.env.ADMIN_DOMAIN!;
    const adminUsersRaw = await this.findUsersByDomain(adminDomain);

    this.logger.log(`Found ${adminUsersRaw.length} admin users.`);

    const adminUsers = adminUsersRaw.map((u) => this.normalizeToPublicUser(u));

    await this.updateAdminUsers(adminUsers);

    this.logger.log('Role initialization complete.');
  }

  async updateAdminUsers(users: PublicUser[]) {
    const adminDomain = process.env.ADMIN_DOMAIN!;
    const invalidUser = users.find(
      (user) => user.email.split('@')[1] !== adminDomain,
    );

    if (invalidUser) {
      throw AppErrorCodes.PERMISSION_DENIED;
    }

    for (const user of users) {
      await this.updateUserRolesById(user.id, [Roles.ADMIN]);
    }
  }

  async updateUserRolesById(
    userId: string,
    roleNames: string[],
  ): Promise<void> {
    const roles = await this.prisma.role.findMany({
      where: {
        name: { in: roleNames },
      },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          set: roles.map((r) => ({ id: r.id })),
        },
      },
    });
  }

  async updateUserRoles(
    userId: string,
    roles: { id: string }[],
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          set: roles.map((r) => ({ id: r.id })),
        },
      },
    });
  }

  /**
   * ドメインでユーザー一覧を取得（roles, extraProfiles を含む）
   */
  async findUsersByDomain(domain: string) {
    return this.prisma.user.findMany({
      where: {
        email: {
          contains: `@${domain}`,
        },
      },
      include: { roles: true, extraProfiles: true },
    });
  }

  /**
   * Prisma のユーザー結果を PublicUser へ正規化
   */
  private normalizeToPublicUser(user: any): PublicUser {
    const { passwordHash, ...data } = user;
    return {
      ...data,
      roles: user.roles ?? [],
      extraProfiles: user.extraProfiles ?? [],
    } as PublicUser;
  }
}
