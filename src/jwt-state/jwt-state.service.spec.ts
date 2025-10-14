import { Test, TestingModule } from '@nestjs/testing';
import { JwtStateService } from './jwt-state.service';
import * as jwtTokenLib from '../lib/auth/jwt-token';
import * as lib from '../lib';
import { HttpException, HttpStatus } from '@nestjs/common';
import { User } from '@prisma/client';
import { getGlobalModule } from '../utils/test/global-modules';

jest.mock('../lib/auth/jwt-token', () => ({
  generateJWTToken: jest.fn(),
}));

jest.mock('../lib', () => ({
  createJWTState: jest.fn(),
  getAllJWTState: jest.fn(),
  getJWTStateById: jest.fn(),
  updateJWTState: jest.fn(),
  deleteJWTState: jest.fn(),
}));

describe('JwtStateService', () => {
  let service: JwtStateService;

  const mockUser: User = {
    id: 'user_123',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: null,
    providers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    role: 'user',
  };

  const sampleJWTState = {
    id: 'jwt_state_1',
    userId: mockUser.id,
    revoked: false,
    tokenHint: 'hint',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await getGlobalModule({
      providers: [JwtStateService],
    }).compile();

    service = module.get<JwtStateService>(JwtStateService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('JWT state lifecycle', () => {
    beforeEach(() => {
      // mock generateJWTToken
      jest.spyOn(jwtTokenLib as any, 'generateJWTToken').mockResolvedValue({
        success: true,
        jwtId: sampleJWTState.id,
        token: 'mock_token',
        profile: { sub: mockUser.id },
        user: { id: mockUser.id },
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      } as any);

      // mock lib functions
      jest
        .spyOn(lib as any, 'createJWTState')
        .mockResolvedValue(sampleJWTState);
      jest
        .spyOn(lib as any, 'getAllJWTState')
        .mockResolvedValue([sampleJWTState]);
      jest
        .spyOn(lib as any, 'getJWTStateById')
        .mockImplementation((id: string) => {
          if (id === sampleJWTState.id) return Promise.resolve(sampleJWTState);
          return Promise.resolve(null);
        });

      jest
        .spyOn(lib as any, 'updateJWTState')
        .mockImplementation((id: string, params: any) => {
          if (id === sampleJWTState.id) {
            return Promise.resolve({ ...sampleJWTState, ...params });
          }
          return Promise.resolve(null);
        });

      jest
        .spyOn(lib as any, 'deleteJWTState')
        .mockImplementation((id: string) => {
          if (id === sampleJWTState.id) return Promise.resolve(sampleJWTState);
          // simulate prisma delete throwing when not found
          const err: any = new Error('Record not found');
          err.code = 'P2025';
          throw err;
        });
    });

    it('createJWT should generate token and return expected payload', async () => {
      const dto = { userId: mockUser.id } as any;

      const res = await service.createJWT(dto);

      expect((jwtTokenLib as any).generateJWTToken).toHaveBeenCalledWith({
        userId: dto.userId,
        expirationHours: 1,
      });
      expect(res).toHaveProperty('jwtId', sampleJWTState.id);
      expect(res).toHaveProperty('token', 'mock_token');
      expect(res).toHaveProperty('profile');
      expect(res).toHaveProperty('user');
      expect(res).toHaveProperty('expiresAt');
    });

    it('findAll should return JWT states for user', async () => {
      const res = await service.findAll(mockUser);
      expect((lib as any).getAllJWTState).toHaveBeenCalledWith({
        userId: mockUser.id,
      });
      expect(res).toEqual([sampleJWTState]);
    });

    it('findOne should return single JWT state when exists', async () => {
      const res = await service.findOne(sampleJWTState.id, mockUser);
      expect((lib as any).getJWTStateById).toHaveBeenCalledWith(
        sampleJWTState.id,
        { userId: mockUser.id },
      );
      expect(res).toEqual(sampleJWTState);
    });

    it('update should update and return updated JWT state when owner', async () => {
      const updated = await service.update(
        sampleJWTState.id,
        { revoked: true } as any,
        mockUser,
        false,
      );
      expect((lib as any).getJWTStateById).toHaveBeenCalledWith(
        sampleJWTState.id,
      );
      expect((lib as any).updateJWTState).toHaveBeenCalledWith(
        sampleJWTState.id,
        { revoked: true } as any,
      );
      expect(updated).toMatchObject({ revoked: true });
    });

    it('remove should delete existing JWT state when owner', async () => {
      const res = await service.remove(sampleJWTState.id, mockUser, false);
      expect((lib as any).getJWTStateById).toHaveBeenCalledWith(
        sampleJWTState.id,
      );
      expect((lib as any).deleteJWTState).toHaveBeenCalledWith(
        sampleJWTState.id,
      );
      expect(res).toEqual(sampleJWTState);
    });

    it('remove should throw NOT_FOUND when deleting non-existing state', async () => {
      await expect(
        service.remove('nonexistent', mockUser, false),
      ).rejects.toThrow(HttpException);
      try {
        await service.remove('nonexistent', mockUser, false);
      } catch (e: any) {
        expect(e.getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });
  });
});
