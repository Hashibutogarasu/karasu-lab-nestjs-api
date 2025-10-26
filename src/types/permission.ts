export enum PermissionType {
  USER_READ = 1 << 0,
  USER_WRITE = 1 << 1,
  VIEW_ALL_USERS = 1 << 2,
  ADMIN_READ = 1 << 3,
  ADMIN_WRITE = 1 << 4,
}

export const PermissionScopes = {
  'user:read': PermissionType.USER_READ,
  'user:write': PermissionType.USER_WRITE,
  'users:view_all': PermissionType.VIEW_ALL_USERS,
  'admin:read': PermissionType.ADMIN_READ,
  'admin:write': PermissionType.ADMIN_WRITE,
};
