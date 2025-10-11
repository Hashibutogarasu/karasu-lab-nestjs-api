import { Test, TestingModule } from '@nestjs/testing';
import { ExternalProviderAccessTokenService } from './external-provider-access-token.service';
import { EncryptionService } from '../encryption.service';

// lib モジュール全体をモック化
jest.mock('../../lib', () => ({
  createExternalProviderAccessToken: jest.fn(),
  updateExternalProviderAccessToken: jest.fn(),
  upsertExternalProviderAccessToken: jest.fn(),
  getExternalProviderAccessTokenById: jest.fn(),
  getExternalProviderAccessTokensByUserId: jest.fn(),
  deleteExternalProviderAccessToken: jest.fn(),
}));

import * as lib from '../../lib';

// Prismaが返すレコード型の定義（実際のモデルに合わせる）
type PrismaRecord = {
  id: string;
  userId: string;
  encryptedToken: string;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
};

describe('ExternalProviderAccessTokenService', () => {
  let service: ExternalProviderAccessTokenService;

  // 型安全なモック関数の取得
  const mockCreateExternalProviderAccessToken =
    lib.createExternalProviderAccessToken as jest.MockedFunction<
      typeof lib.createExternalProviderAccessToken
    >;
  const mockUpdateExternalProviderAccessToken =
    lib.updateExternalProviderAccessToken as jest.MockedFunction<
      typeof lib.updateExternalProviderAccessToken
    >;
  const mockUpsertExternalProviderAccessToken =
    lib.upsertExternalProviderAccessToken as jest.MockedFunction<
      typeof lib.upsertExternalProviderAccessToken
    >;
  const mockGetExternalProviderAccessTokenById =
    lib.getExternalProviderAccessTokenById as jest.MockedFunction<
      typeof lib.getExternalProviderAccessTokenById
    >;
  const mockGetExternalProviderAccessTokensByUserId =
    lib.getExternalProviderAccessTokensByUserId as jest.MockedFunction<
      typeof lib.getExternalProviderAccessTokensByUserId
    >;
  const mockDeleteExternalProviderAccessToken =
    lib.deleteExternalProviderAccessToken as jest.MockedFunction<
      typeof lib.deleteExternalProviderAccessToken
    >;

  // 暗号化サービスのモック
  const mockEncryptionService = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  };

  beforeEach(async () => {
    // ダミーレコードの作成（Prismaが返すDateTime型）
    const dummyRecord: PrismaRecord = {
      id: 'dummy',
      userId: 'u-dummy',
      encryptedToken: 'enc:dummy',
      provider: 'p',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // モックの実装設定
    mockEncryptionService.encrypt.mockImplementation((s: string) => `enc:${s}`);
    mockEncryptionService.decrypt.mockImplementation((s: string) =>
      s.startsWith('enc:') ? s.slice(4) : `dec:${s}`,
    );

    // lib関数のモック初期化
    mockCreateExternalProviderAccessToken.mockResolvedValue(dummyRecord);
    mockUpdateExternalProviderAccessToken.mockResolvedValue(dummyRecord);
    mockUpsertExternalProviderAccessToken.mockResolvedValue(dummyRecord);
    mockGetExternalProviderAccessTokenById.mockResolvedValue(null);
    mockGetExternalProviderAccessTokensByUserId.mockResolvedValue([]);
    mockDeleteExternalProviderAccessToken.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalProviderAccessTokenService,
        { provide: EncryptionService, useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<ExternalProviderAccessTokenService>(
      ExternalProviderAccessTokenService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('saves a token by encrypting then creating', async () => {
    await service.save({ userId: 'u1', token: 'plain', provider: 'google' });

    expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('plain');
    expect(mockCreateExternalProviderAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        encryptedToken: 'enc:plain',
        userId: 'u1',
        provider: 'google',
      }),
    );
  });

  it('updates a token when raw token provided (encrypts) and calls update', async () => {
    await service.update('id1', { token: 'newraw' });

    expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('newraw');
    expect(mockUpdateExternalProviderAccessToken).toHaveBeenCalledWith('id1', {
      encryptedToken: 'enc:newraw',
    });
  });

  it('upserts token by encrypting then calling upsert', async () => {
    await service.upsert(
      { userId: 'u1', provider: 'google' },
      { userId: 'u1', token: 't', provider: 'google' },
    );

    expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('t');
    expect(mockUpsertExternalProviderAccessToken).toHaveBeenCalledWith(
      { userId: 'u1', provider: 'google' },
      expect.objectContaining({
        encryptedToken: 'enc:t',
        userId: 'u1',
        provider: 'google',
      }),
      expect.objectContaining({ encryptedToken: 'enc:t', provider: 'google' }),
    );
  });

  it('returns raw encrypted record from getById', async () => {
    const record: PrismaRecord = {
      id: 'r1',
      userId: 'u1',
      encryptedToken: 'enc:abc',
      provider: 'google',
      createdAt: new Date('2020-01-01T00:00:00Z'),
      updatedAt: new Date('2020-01-02T00:00:00Z'),
    };
    mockGetExternalProviderAccessTokenById.mockResolvedValue(record);

    const res = await service.getById('r1');

    expect(res).toEqual(record);
    expect(mockGetExternalProviderAccessTokenById).toHaveBeenCalledWith('r1');
  });

  it('getDecryptedById returns decrypted token and ISO timestamps', async () => {
    const record: PrismaRecord = {
      id: 'r2',
      userId: 'u2',
      encryptedToken: 'enc:secret',
      provider: 'x',
      createdAt: new Date('2021-01-01T00:00:00Z'),
      updatedAt: new Date('2021-01-02T00:00:00Z'),
    };
    mockGetExternalProviderAccessTokenById.mockResolvedValue(record);

    const res = await service.getDecryptedById('r2');

    expect(mockEncryptionService.decrypt).toHaveBeenCalledWith('enc:secret');
    expect(res).not.toBeNull();
    expect(res?.token).toBe('secret');
    expect(res?.createdAt).toBe('2021-01-01T00:00:00.000Z');
    expect(res?.updatedAt).toBe('2021-01-02T00:00:00.000Z');
    expect(mockGetExternalProviderAccessTokenById).toHaveBeenCalledWith('r2');
  });

  it('deletes a token by id', async () => {
    await service.delete('del1');

    expect(mockDeleteExternalProviderAccessToken).toHaveBeenCalledWith('del1');
  });
});
