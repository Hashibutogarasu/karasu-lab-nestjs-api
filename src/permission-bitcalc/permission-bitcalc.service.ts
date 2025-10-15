import { Injectable } from '@nestjs/common';
import { PermissionType } from '../types/permission';
import { AppErrorCodes } from '../types/error-codes';

@Injectable()
export class PermissionBitcalcService {
  encode(perms: PermissionType[]): number {
    if (!perms || perms.length === 0) return 0;

    const enumNumbers = Object.values(PermissionType).filter(
      (v) => typeof v === 'number',
    ) as number[];

    for (const p of perms) {
      if (!enumNumbers.includes(p as number)) {
        throw AppErrorCodes.INVALID_PERMISSION;
      }
    }

    const seen = new Set<number>();
    for (const p of perms) {
      const n = p as number;
      if (seen.has(n)) {
        throw AppErrorCodes.DUPLICATE_PERMISSION;
      }
      seen.add(n);
    }

    return perms.reduce((acc, p) => acc | (p as number), 0);
  }

  decode(value: number): PermissionType[] {
    if (!value) return [];

    const enumNumbers = Object.values(PermissionType).filter(
      (v) => typeof v === 'number',
    ) as number[];

    const allKnownMask = enumNumbers.reduce((acc, n) => acc | n, 0);
    if ((value & ~allKnownMask) !== 0) {
      throw AppErrorCodes.INVALID_PERMISSION_BITMASK;
    }

    return enumNumbers
      .filter((bit: number) => (value & bit) === bit)
      .map((bit) => bit as PermissionType);
  }
}
