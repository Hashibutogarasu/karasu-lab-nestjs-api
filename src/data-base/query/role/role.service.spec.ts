import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from './role.service';
import { mock } from 'jest-mock-extended';
import { DataBaseService } from '../../data-base.service';
import { PermissionBitcalcService } from '../../../permission-bitcalc/permission-bitcalc.service';
import { PermissionType } from '../../../types/permission';

describe('RoleService', () => {
  let service: RoleService;

  beforeEach(async () => {
    const mockDatabaseService = mock<DataBaseService>();
    const mockPermissionbitcalcService = mock<PermissionBitcalcService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        {
          provide: DataBaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: PermissionBitcalcService,
          useValue: mockPermissionbitcalcService,
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
