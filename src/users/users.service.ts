import { Injectable } from '@nestjs/common';
import {
  findUsersByDomain,
  findUserByEmail,
  findUserById,
  updateUserRoles as dbUpdateUserRoles,
  findRoleByName,
  updateUserRoles,
} from '../lib';
import { Role, RoleDefinitions, Roles } from '../types/roles';

@Injectable()
export class UsersService {
  async exists(userId: string) {
    return (await findUserById(userId)) !== undefined;
  }

  async findById(userId: string) {
    return findUserById(userId);
  }

  async findByEmail(email: string) {
    return findUserByEmail(email);
  }

  async findUsersByDomain(domain: string) {
    return findUsersByDomain(domain);
  }

  async updateUserRoles(userId: string, roleDefinitions: string[]) {
    const requestedRoles: Role[] = roleDefinitions
      .map((k) => {
        return (RoleDefinitions as any)[k as keyof typeof RoleDefinitions];
      })
      .filter((r): r is Role => !!r);

    const rolesWithNulls = await Promise.all(
      requestedRoles.map((role) => findRoleByName(role.name)),
    );
    const roles = rolesWithNulls.filter(
      (role): role is NonNullable<typeof role> => role !== null,
    );
    return updateUserRoles(userId, roles);
  }
}
