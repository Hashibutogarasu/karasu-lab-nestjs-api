import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { mock } from 'jest-mock-extended';
import { DataBaseService } from '../../data-base.service';
import { UtilityService } from '../../utility/utility.service';
import { RoleService } from '../role/role.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const mockDatabaseService = mock<DataBaseService>();
    const mockUtilityService = mock<UtilityService>();
    const mockRoleService = mock<RoleService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: DataBaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: UtilityService,
          useValue: mockUtilityService,
        },
        {
          provide: RoleService,
          useValue: mockRoleService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
