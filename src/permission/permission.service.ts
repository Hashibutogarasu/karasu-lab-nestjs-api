import { Injectable } from '@nestjs/common';
import { PermissionScopes, PermissionType } from '../types/permission';
import { AppErrorCodes } from '../types/error-codes';

@Injectable()
export class PermissionService {
  /**
   * スコープ名の配列 (例: ['user:read']) を PermissionType の配列へ変換する
   * 未定義のスコープは無視される
   */
  scopesToPermissions(scopes: string[]): PermissionType[] {
    return scopes
      .map((s) => PermissionScopes[s as keyof typeof PermissionScopes])
      .filter((p): p is PermissionType => typeof p === 'number');
  }

  /**
   * PermissionType の配列をスコープ名の配列へ変換する
   * 未定義の PermissionType は無視される
   */
  permissionsToScopes(perms: (PermissionType | number)[]): string[] {
    const entries = Object.entries(PermissionScopes) as [
      string,
      PermissionType,
    ][];
    return perms
      .map((p) => {
        const found = entries.find(([, v]) => v === p);
        return found ? found[0] : null;
      })
      .filter((s): s is string => typeof s === 'string');
  }

  /**
   * スコープ名の配列をビットマスクに変換する。
   * 未定義のスコープが含まれている場合は変換を中断して AppErrorCodes.INVALID_SCOPE を投げる。
   */
  scopesToBitmask(scopes: string[]): number {
    let mask = 0;
    for (const s of scopes) {
      const val = PermissionScopes[s as keyof typeof PermissionScopes];
      if (typeof val !== 'number') {
        throw AppErrorCodes.INVALID_SCOPE;
      }
      mask |= val;
    }
    return mask;
  }

  /**
   * ビットマスクからスコープ名の配列へ変換する。
   * ビットマスクに定義されていないビットが含まれていても、それらは無視される。
   */
  bitmaskToScopes(mask: number): string[] {
    const entries = Object.entries(PermissionScopes) as [
      string,
      PermissionType,
    ][];
    return entries.filter(([, v]) => (mask & v) === v).map(([k]) => k);
  }

  /**
   * OAuth クライアントが要求する権限リストから、ユーザーが付与可能なものだけを残すフィルタ。
   * - 第一引数: ユーザーが持つ権限の配列 (PermissionType の配列または数値配列)
   * - 第二引数: OAuth クライアントが要求する権限の配列 (PermissionType の配列または数値配列)
   * - 第三引数(省略可能): OAuth クライアントのオーナーが持つ権限の配列 (PermissionType の配列または数値配列)
   *
   * 動作: ユーザーの権限をビットマスクに合成し、クライアント要求中の各権限がそのマスクに含まれているかを判定する。
   *  含まれていれば許可対象として残し、含まれていなければ除外する。
   */
  filterRequestedPermissions(
    userPerms: (PermissionType | number)[],
    clientPerms: (PermissionType | number)[],
    clientOwnerPerms?: (PermissionType | number)[],
  ): PermissionType[] {
    let cappedRequested = clientPerms;
    if (clientOwnerPerms && clientOwnerPerms.length > 0) {
      const ownerMask = clientOwnerPerms.reduce(
        (acc, p) => acc | (p as number),
        0,
      );
      cappedRequested = clientPerms.filter(
        (p) => ((p as number) & ownerMask) === (p as number),
      );
    }

    const userMask = userPerms.reduce((acc, p) => acc | (p as number), 0);
    return cappedRequested.filter(
      (p) => ((p as number) & userMask) === (p as number),
    ) as PermissionType[];
  }
}
