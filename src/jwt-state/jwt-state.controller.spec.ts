import { TestingModule } from '@nestjs/testing';
import { JwtStateController } from './jwt-state.controller';
import { getGlobalModule } from '../utils/test/global-modules';
import { JwtstateService } from '../data-base/query/jwtstate/jwtstate.service';
import { mock, MockProxy } from 'jest-mock-extended';
import { DataBaseService } from '../data-base/data-base.service';
import { UtilityService } from '../data-base/utility/utility.service';
import { RoleService } from '../data-base/query/role/role.service';
import { JwtTokenService } from '../auth/jwt-token/jwt-token.service';
import { JWTState } from '@prisma/client';

describe('JwtStateController', () => {
  let controller: JwtStateController;
  let jwtStateService: MockProxy<JwtstateService>;
  const user = { id: 'user1', role: 'user' } as any;
  const admin = { id: 'admin1', role: 'admin' } as any;
  const jwtStates = [
    { id: 'jwt1', userId: 'user1' },
    { id: 'jwt2', userId: 'user2' },
  ] as JWTState[];

  beforeEach(async () => {
    const mockDatabaseService = mock<DataBaseService>();
    const mockUtilityService = mock<UtilityService>();
    const mockRoleService = mock<RoleService>();
    const mockJwtTokenService = mock<JwtTokenService>();

    jwtStateService = mock<JwtstateService>();

    const module: TestingModule = await getGlobalModule({
      controllers: [JwtStateController],
      providers: [
        { provide: JwtstateService, useValue: jwtStateService },
        { provide: DataBaseService, useValue: mockDatabaseService },
        { provide: UtilityService, useValue: mockUtilityService },
        { provide: RoleService, useValue: mockRoleService },
        { provide: JwtTokenService, useValue: mockJwtTokenService },
      ],
    }).compile();

    controller = module.get<JwtStateController>(JwtStateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should allow a non-admin user to get only their own JWTState', async () => {
      jwtStateService.findAll.mockResolvedValue([jwtStates[0]]);
      // isAdmin: false
      const result = await controller.findAll(user);
      expect(jwtStateService.findAll).toHaveBeenCalledWith(user);
      expect(result).toEqual([jwtStates[0]]);
    });

    it("should allow an admin to get all users' JWTStates", async () => {
      jwtStateService.findAll.mockResolvedValue(jwtStates);
      // isAdmin: true
      const result = await controller.findAll(admin);
      expect(jwtStateService.findAll).toHaveBeenCalledWith(admin);
      expect(result).toEqual(jwtStates);
    });
  });

  describe('remove', () => {
    it('should allow a non-admin user to remove only their own JWTState', async () => {
      jwtStateService.remove.mockResolvedValue(jwtStates[0]);
      // isAdmin: false
      const result = await controller.remove({ id: 'jwt1' }, user, false);
      expect(jwtStateService.remove).toHaveBeenCalledWith('jwt1', user, false);
      expect(result).toEqual(jwtStates[0]);
    });

    it("should throw if a non-admin user tries to remove another user's JWTState", async () => {
      jwtStateService.remove.mockRejectedValue(
        new Error('You can remove only your jwt state'),
      );
      // isAdmin: false
      await expect(
        controller.remove({ id: 'jwt2' }, user, false),
      ).rejects.toThrow('You can remove only your jwt state');
    });

    it("should allow an admin to remove any user's JWTState", async () => {
      jwtStateService.remove.mockResolvedValue(jwtStates[1]);
      // isAdmin: true
      const result = await controller.remove({ id: 'jwt2' }, admin, true);
      expect(jwtStateService.remove).toHaveBeenCalledWith('jwt2', admin, true);
      expect(result).toEqual(jwtStates[1]);
    });
  });
});
