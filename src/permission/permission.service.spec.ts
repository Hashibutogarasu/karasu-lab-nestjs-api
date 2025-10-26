import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from './permission.service';
import { PermissionType } from '../types/permission';
import { AppErrorCodes } from '../types/error-codes';

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionService],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('converts scopes to permissions', () => {
    const scopes = ['user:read', 'user:write'];
    const perms = service.scopesToPermissions(scopes);
    expect(perms).toEqual([
      PermissionType.USER_READ,
      PermissionType.USER_WRITE,
    ]);
  });

  it('converts permissions to scopes', () => {
    const perms = [PermissionType.USER_READ, PermissionType.USER_WRITE];
    const scopes = service.permissionsToScopes(perms);
    expect(scopes).toEqual(['user:read', 'user:write']);
  });

  it('round trips permissions -> scopes -> permissions', () => {
    const start = [PermissionType.USER_READ, PermissionType.VIEW_ALL_USERS];
    const scopes = service.permissionsToScopes(start);
    const end = service.scopesToPermissions(scopes);
    expect(new Set(end)).toEqual(new Set(start));
  });

  it('converts scopes to bitmask', () => {
    const scopes = ['user:read', 'user:write'];
    const mask = service.scopesToBitmask(scopes);
    expect(mask).toEqual(PermissionType.USER_READ | PermissionType.USER_WRITE);
  });

  it('converts bitmask to scopes and strips unknown bits', () => {
    const mask =
      PermissionType.USER_READ | PermissionType.USER_WRITE | (1 << 10);
    const scopes = service.bitmaskToScopes(mask);
    expect(scopes).toEqual(['user:read', 'user:write']);
  });

  it('throws INVALID_SCOPE when scopes contain unknown entries', () => {
    expect(() =>
      service.scopesToBitmask(['user:read', 'invalid:scope']),
    ).toThrow(AppErrorCodes.INVALID_SCOPE);
  });

  it("allows requested scopes that are within user's permissions", () => {
    // ユーザーが USER_READ, USER_WRITE を持っている
    const userPerms = [PermissionType.USER_READ, PermissionType.USER_WRITE];
    // クライアントは USER_READ を要求
    const clientReq = [PermissionType.USER_READ];
    const allowed = service.filterRequestedPermissions(userPerms, clientReq);
    expect(allowed).toEqual([PermissionType.USER_READ]);
  });

  it("filters out requested scopes that exceed user's permissions", () => {
    // ユーザーは USER_READ のみ
    const userPerms = [PermissionType.USER_READ];
    // クライアントは USER_READ と USER_WRITE を要求
    const clientReq = [PermissionType.USER_READ, PermissionType.USER_WRITE];
    const allowed = service.filterRequestedPermissions(userPerms, clientReq);
    // USER_WRITE はユーザーにないので除外される
    expect(allowed).toEqual([PermissionType.USER_READ]);
  });
});
