import { Test, TestingModule } from '@nestjs/testing';
import { ExternalProviderLinkVerifyService } from './external-provider-link-verify.service';
import { mock } from 'jest-mock-extended';
import { DataBaseService } from '../../data-base.service';
import { UtilityService } from '../../utility/utility.service';
import * as bcrypt from 'bcrypt';

type EPRec = {
  id: string;
  userId: string;
  provider: string;
  rawExternalProviderProfile: any;
  verifyHashedCode: string;
  expiresAt: Date;
  createdAt: Date;
};

describe('ExternalProviderLinkVerifyService', () => {
  let service: ExternalProviderLinkVerifyService;

  beforeEach(async () => {
    const mockDataBaseService = mock<DataBaseService>({
      prisma: jest.fn().mockImplementation(() => ({
        externalProviderLinkVerify: {
          deleteMany: async ({ where }: any) => {
            if (where.userId && where.provider) {
              const before = store.length;
              for (let i = store.length - 1; i >= 0; i--) {
                if (store[i].userId === where.userId && store[i].provider === where.provider) {
                  store.splice(i, 1);
                }
              }
              return { count: before - store.length };
            }
            if (where.expiresAt && where.expiresAt.lt) {
              const now = where.expiresAt.lt;
              const before = store.length;
              for (let i = store.length - 1; i >= 0; i--) {
                if (store[i].expiresAt < now) store.splice(i, 1);
              }
              return { count: before - store.length };
            }
            return { count: 0 };
          },
          create: async ({ data }: any) => {
            const rec: EPRec = {
              id: `id_${Math.random().toString(36).slice(2, 9)}`,
              userId: data.userId,
              provider: data.provider,
              rawExternalProviderProfile: data.rawExternalProviderProfile,
              verifyHashedCode: data.verifyHashedCode,
              expiresAt: data.expiresAt,
              createdAt: new Date(),
            };
            store.push(rec);
            return rec;
          },
          findMany: async ({ where }: any) => {
            const now = where.expiresAt.gt;
            return store.filter((s) => s.provider === where.provider && s.expiresAt > now);
          },
          delete: async ({ where }: any) => {
            const idx = store.findIndex((s) => s.id === where.id);
            if (idx === -1) throw new Error('Record not found');
            store.splice(idx, 1);
            return true;
          },
        },
      }))
    });
    const mockUtilityService = mock<UtilityService>({
      generateRandomString: jest.fn().mockImplementation((len = 12) => 'verifycode1234'.slice(0, len)),
      calculateExpiration: jest.fn().mockImplementation((minutes = 10) => new Date(Date.now() + minutes * 60 * 1000)),
    });

    const store: EPRec[] = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalProviderLinkVerifyService,
        { provide: DataBaseService, useValue: mockDataBaseService },
        { provide: UtilityService, useValue: mockUtilityService },
      ],
    }).compile();

    service = module.get<ExternalProviderLinkVerifyService>(ExternalProviderLinkVerifyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create returns unhashed verifyCode and proper expiry', async () => {
    const created = await service.create({
      userId: 'user_1',
      provider: 'discord',
      rawExternalProviderProfile: { foo: 'bar' },
      expiresInMinutes: 10,
    });

    expect(created.verifyCode).toBeDefined();
    expect(typeof created.verifyCode).toBe('string');
    expect(created.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('verify rejects hashed code and accepts unhashed within expiry', async () => {
    const created = await service.create({
      userId: 'user_1',
      provider: 'discord',
      rawExternalProviderProfile: {},
      expiresInMinutes: 10,
    });

    const rehashed = await bcrypt.hash(created.verifyCode, 12);
    const hashedResult = await service.verify({ userId: 'user_1', provider: 'discord', verifyCode: rehashed });
    expect(hashedResult).toBe(false);

    const goodResult = await service.verify({ userId: 'user_1', provider: 'discord', verifyCode: created.verifyCode });
    expect(goodResult).toBe(true);
  });

  it('expired record does not verify even with correct code', async () => {
    const expired = await service.create({
      userId: 'user_2',
      provider: 'github',
      rawExternalProviderProfile: {},
      expiresInMinutes: -1,
    });

    const expiredResult = await service.verify({ userId: 'user_2', provider: 'github', verifyCode: expired.verifyCode });
    expect(expiredResult).toBe(false);
  });

  it('verify rejects wrong code', async () => {
    const wrong = await service.verify({ userId: 'user_3', provider: 'discord', verifyCode: 'totally-wrong-code' });
    expect(wrong).toBe(false);
  });

  it('delete removes existing record and throws for non-existent id', async () => {
    const toDelete = await service.create({ userId: 'del_user', provider: 'p', rawExternalProviderProfile: {}, expiresInMinutes: 10 });
    const delOk = await service.delete(toDelete.id);
    expect(delOk).toBe(true);

    await expect(service.delete('non-existent-id')).rejects.toBeDefined();
  });
});
