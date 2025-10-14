import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getGlobalModule } from '../utils/test/global-modules';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await getGlobalModule({
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
