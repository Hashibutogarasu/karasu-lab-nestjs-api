import { Test, TestingModule } from '@nestjs/testing';
import { RoleController } from './role.controller';
import { getGlobalModule } from '../utils/test/global-modules';
import { RoleService } from './role.service';

describe('RoleController', () => {
  let controller: RoleController;

  beforeEach(async () => {
    const module: TestingModule = await getGlobalModule({
      controllers: [RoleController],
      providers: [
        {
          provide: RoleService,
          useValue: {
            updateAdminUsers: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RoleController>(RoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
