import { Test, TestingModule } from '@nestjs/testing';
import { User } from '@prisma/client';
import { JwtstateService } from '../data-base/query/jwtstate/jwtstate.service';
import { mock } from 'jest-mock-extended';
import { DataBaseService } from '../data-base/data-base.service';
import { UtilityService } from '../data-base/utility/utility.service';
import { JwtTokenService } from '../auth/jwt-token/jwt-token.service';
import { AppErrorCodes } from '../types/error-codes';

describe('JwtStateService', () => {
  const mockUser: User = {
    id: 'user_123',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: null,
    providers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleJWTState = {
    id: 'jwt_state_1',
    userId: mockUser.id,
    revoked: false,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let mockJwtStateService: JwtstateService;
  let mockJwtTokenService: JwtTokenService;
  let mockDatabaseService: DataBaseService;
  let mockUtilityService: UtilityService;

  beforeEach(async () => {
    mockDatabaseService = mock<DataBaseService>();
    (mockDatabaseService.prisma as unknown as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        jWTState: {
          create: jest.fn().mockResolvedValue(sampleJWTState),
          findMany: jest.fn().mockImplementation(({ where }) => {
            if (where?.userId === mockUser.id)
              return Promise.resolve([sampleJWTState]);
            return Promise.resolve([]);
          }),
          findFirst: jest.fn().mockImplementation(({ where }) => {
            if (where?.id === sampleJWTState.id) {
              if (where.userId && where.userId !== mockUser.id)
                return Promise.resolve(null);
              return Promise.resolve(sampleJWTState);
            }
            return Promise.resolve(null);
          }),
          update: jest.fn().mockImplementation(({ where, data }) => {
            if (where?.id !== sampleJWTState.id)
              return Promise.reject(new Error('Not found'));
            return Promise.resolve({ ...sampleJWTState, ...data });
          }),
          delete: jest.fn().mockImplementation(({ where }) => {
            if (where?.id !== sampleJWTState.id)
              return Promise.reject(new Error('Not found'));
            return Promise.resolve(sampleJWTState);
          }),
        },
      });
    mockUtilityService = mock<UtilityService>();

    mockJwtTokenService = mock<JwtTokenService>({
      generateJWTToken: jest.fn().mockResolvedValue({
        success: true,
        jti: sampleJWTState.id,
        accessToken: 'mock_token',
        refreshToken: 'mock_refresh_token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        userId: mockUser.id,
      }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: DataBaseService, useValue: mockDatabaseService },
        JwtstateService,
        { provide: UtilityService, useValue: mockUtilityService },
        { provide: JwtTokenService, useValue: mockJwtTokenService },
      ],
    }).compile();

    mockJwtStateService = module.get<JwtstateService>(JwtstateService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(mockJwtStateService).toBeDefined();
  });

  describe('JWT state lifecycle', () => {
    it('createJWT should generate token and return expected payload', async () => {
      const dto = { userId: mockUser.id, expirationHours: 1 };
      const res = await mockJwtStateService.createJWT(dto);
      expect(res).toHaveProperty('jti', sampleJWTState.id);
      expect(res).toHaveProperty('expiresAt');
      expect(res).toHaveProperty('userId', mockUser.id);
    });

    it('findAll should return JWT states for user', async () => {
      await mockJwtStateService.createJWT({
        userId: mockUser.id,
      });
      const res = await mockJwtStateService.findAll(mockUser);
      expect(res).toEqual({
        states: [sampleJWTState],
      });
    });

    it('findOne should return single JWT state when exists', async () => {
      const res = await mockJwtStateService.findOne(
        sampleJWTState.id,
        mockUser,
      );
      expect(res).toEqual(sampleJWTState);
    });

    it('update should update and return updated JWT state when owner', async () => {
      const updated = await mockJwtStateService.update(
        sampleJWTState.id,
        { revoked: true },
        mockUser,
        false,
      );
      expect(updated).toMatchObject({ revoked: true });
    });

    it('remove should delete existing JWT state when owner', async () => {
      const res = await mockJwtStateService.remove(
        sampleJWTState.id,
        mockUser,
        false,
      );
      expect(res).toEqual(sampleJWTState);
    });

    it('remove should throw NOT_FOUND when deleting non-existing state', async () => {
      await expect(
        mockJwtStateService.remove('nonexistent', mockUser, false),
      ).rejects.toThrow(AppErrorCodes.JWT_STATE_NOT_FOUND);
    });
  });
});
