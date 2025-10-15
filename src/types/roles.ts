import { PermissionType } from './permission';

export class Role {
  name: string;
  permissions: PermissionType[];

  constructor(name: string, permissions: PermissionType[]) {
    this.name = name;
    this.permissions = permissions;
  }
}

export enum Roles {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export const RoleDefinitions: { [key in Roles]: Role } = {
  [Roles.USER]: new Role('user', [
    PermissionType.USER_READ,
    PermissionType.USER_WRITE,
  ]),
  [Roles.ADMIN]: new Role('admin', [
    PermissionType.USER_READ,
    PermissionType.USER_WRITE,
    PermissionType.ADMIN_READ,
    PermissionType.ADMIN_WRITE,
  ]),
};
