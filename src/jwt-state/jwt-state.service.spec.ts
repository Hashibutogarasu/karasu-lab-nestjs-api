import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtstateService } from '../data-base/query/jwtstate/jwtstate.service';
import { mock } from 'jest-mock-extended';
import { DataBaseService } from '../data-base/data-base.service';
import { UtilityService } from '../data-base/utility/utility.service';
import { JwtTokenService } from '../auth/jwt-token/jwt-token.service';

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
    tokenHint: 'hint',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let mockJwtStateService: JwtstateService;
  let mockJwtTokenService: JwtTokenService;
  let mockDatabaseService: DataBaseService;
  let mockUtilityService: UtilityService;

  beforeEach(async () => {
    mockDatabaseService = new DataBaseService();
    mockUtilityService = mock<UtilityService>();
    mockJwtTokenService = mock<JwtTokenService>({
      generateJWTToken: jest.fn().mockResolvedValue({
        success: true,
        jwtId: sampleJWTState.id,
        token: 'mock_token',
        profile: {
          sub: mockUser.id,
          name: mockUser.username,
          email: mockUser.email,
          providers: mockUser.providers,
        },
        user: {
          roles: [],
        },
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtstateService,
        { provide: DataBaseService, useValue: mockDatabaseService },
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
      const dto = { userId: mockUser.id };
      const res = await mockJwtStateService.createJWT(dto);
      expect(mockJwtTokenService.generateJWTToken).toHaveBeenCalledWith({
        userId: dto.userId,
      });
      expect(res).toHaveProperty('jwtId', sampleJWTState.id);
      expect(res).toHaveProperty('token', 'mock_token');
      expect(res).toHaveProperty('profile');
      expect(res).toHaveProperty('user');
      expect(res).toHaveProperty('expiresAt');
    });

    it('findAll should return JWT states for user', async () => {
      await mockJwtStateService.createJWT({
        userId: mockUser.id,
      });
      const res = await mockJwtStateService.findAll(mockUser);
      expect(res).toEqual([sampleJWTState]);
    });

    it('findOne should return single JWT state when exists', async () => {
      const res = await mockJwtStateService.findOne(sampleJWTState.id, mockUser);
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
      const res = await mockJwtStateService.remove(sampleJWTState.id, mockUser, false);
      expect(res).toEqual(sampleJWTState);
    });

    it('remove should throw NOT_FOUND when deleting non-existing state', async () => {
      await expect(
        mockJwtStateService.remove('nonexistent', mockUser, false),
      ).rejects.toThrow(HttpException);
    });
  });
});
