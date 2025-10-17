export enum PermissionType {
  USER_READ = 1 << 0,
  USER_WRITE = 1 << 1,
  VIEW_ALL_USERS = 1 << 2,
  ADMIN_READ = 1 << 3,
  ADMIN_WRITE = 1 << 4,
}
