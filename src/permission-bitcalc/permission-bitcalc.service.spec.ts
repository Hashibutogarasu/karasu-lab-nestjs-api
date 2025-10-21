import { Test, TestingModule } from '@nestjs/testing';
import { PermissionBitcalcService } from './permission-bitcalc.service';
import { getGlobalModule } from '../utils/test/global-modules';
import { PermissionType } from '../types/permission';
import { AppErrorCodes } from '../types/error-codes';
import { DataBaseService } from '../data-base/data-base.service';
import { mock } from 'jest-mock-extended';
import { UtilityService } from '../data-base/utility/utility.service';

describe('PermissionBitcalcService', () => {
  let service: PermissionBitcalcService;

  beforeEach(async () => {
    const mockDatabaseServie = mock<DataBaseService>();
    const mockUtilityService = mock<UtilityService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionBitcalcService,
        {
          provide: DataBaseService,
          useValue: mockDatabaseServie,
        },
        {
          provide: UtilityService,
          useValue: mockUtilityService,
        },
      ],
    }).compile();

    service = module.get<PermissionBitcalcService>(PermissionBitcalcService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encode - normal and edge cases', () => {
    it('encodes single permission', () => {
      const mask = service.encode([PermissionType.USER_READ]);
      expect(mask).toBe(PermissionType.USER_READ);
    });

    it('encodes multiple permissions into combined mask', () => {
      const mask = service.encode([
        PermissionType.USER_READ,
        PermissionType.ADMIN_WRITE,
      ]);
      expect(mask).toBe(PermissionType.USER_READ | PermissionType.ADMIN_WRITE);
    });
  });

  describe('encode - error cases', () => {
    it('throws DUPLICATE_PERMISSION for duplicate entries', () => {
      expect(() =>
        service.encode([PermissionType.USER_READ, PermissionType.USER_READ]),
      ).toThrow(AppErrorCodes.DUPLICATE_PERMISSION);
    });
  });

  describe('decode - normal and edge cases', () => {
    it('decodes combined mask to permissions', () => {
      const mask =
        PermissionType.USER_READ |
        PermissionType.ADMIN_READ |
        PermissionType.USER_WRITE;
      const perms = service.decode(mask);
      expect(perms).toEqual(
        expect.arrayContaining([
          PermissionType.USER_READ,
          PermissionType.ADMIN_READ,
          PermissionType.USER_WRITE,
        ]),
      );
    });
  });

  describe('decode - error cases', () => {
    it('throws INVALID_PERMISSION_BITMASK for unknown bits set', () => {
      const enumNumbers = Object.values(PermissionType).filter(
        (v) => typeof v === 'number',
      );
      const allKnownMask = enumNumbers.reduce((acc, n) => acc | n, 0);
      const invalidMask = allKnownMask | (1 << 10);
      expect(() => service.decode(invalidMask)).toThrow(
        AppErrorCodes.INVALID_PERMISSION_BITMASK,
      );
    });
  });
});
