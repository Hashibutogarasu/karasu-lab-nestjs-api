import { Injectable, BadRequestException } from '@nestjs/common';
import { EncryptionService } from '../encryption.service';
import {
  ExternalProviderAccessTokenCreateDto,
  ExternalProviderAccessTokenUpdateDto,
} from '../../types/external-provider-access-token';
import { ExternalProviderAccessTokenDecryptedRecord } from '../../types/external-provider-access-token';
import {
  createExternalProviderAccessToken,
  deleteExternalProviderAccessToken,
  getExternalProviderAccessTokenById,
  getExternalProviderAccessTokensByUserId,
  updateExternalProviderAccessToken,
  upsertExternalProviderAccessToken,
} from '../../lib';

@Injectable()
export class ExternalProviderAccessTokenService {
  constructor(private readonly encryptionService: EncryptionService) {}

  /**
   * 新しい外部プロバイダのアクセストークンを保存します。
   * 生のトークンを受け取り、保存前に暗号化します。
   */
  async save(data: { userId: string; token: string; provider: string }) {
    if (!data || !data.userId || !data.token || !data.provider) {
      throw new BadRequestException('userId, token and provider are required');
    }

    const encryptedToken = this.encryptionService.encrypt(data.token);

    const createDto: ExternalProviderAccessTokenCreateDto = {
      userId: data.userId,
      encryptedToken,
      provider: data.provider,
    };

    return createExternalProviderAccessToken(createDto);
  }

  async getById(id: string) {
    if (!id) throw new BadRequestException('id is required');
    return getExternalProviderAccessTokenById(id);
  }

  async getByUserId(userId: string) {
    if (!userId) throw new BadRequestException('userId is required');
    return getExternalProviderAccessTokensByUserId(userId);
  }

  /**
   * idでレコードを取得し、復号済みの `token` プロパティを付与して返します。
   */
  async getDecryptedById(
    id: string,
  ): Promise<ExternalProviderAccessTokenDecryptedRecord | null> {
    if (!id) throw new BadRequestException('id is required');

    const record = await getExternalProviderAccessTokenById(id);
    if (!record) return null;

    const decrypted = this.encryptionService.decrypt(record.encryptedToken);
    const createdAt =
      (record.createdAt as unknown) instanceof Date
        ? record.createdAt.toISOString()
        : String(record.createdAt);

    const updatedAt =
      (record.updatedAt as unknown) instanceof Date
        ? record.updatedAt.toISOString()
        : String(record.updatedAt);

    const result: ExternalProviderAccessTokenDecryptedRecord = {
      id: record.id,
      userId: record.userId,
      encryptedToken: record.encryptedToken,
      provider: record.provider,
      createdAt,
      updatedAt,
      token: decrypted,
    };

    return result;
  }

  /**
   * idで既存レコードを更新します。`encryptedToken` または 生の `token` のどちらかを受け付けます。
   */
  async update(
    id: string,
    data: { encryptedToken?: string; token?: string; provider?: string },
  ) {
    if (!id) throw new BadRequestException('id is required');

    const updatePayload: Partial<ExternalProviderAccessTokenUpdateDto> = {};

    if (data.token) {
      updatePayload.encryptedToken = this.encryptionService.encrypt(data.token);
    } else if (data.encryptedToken) {
      updatePayload.encryptedToken = data.encryptedToken;
    }

    if (data.provider) {
      updatePayload.provider = data.provider;
    }

    return updateExternalProviderAccessToken(id, updatePayload);
  }

  /**
   * where (id または userId+provider) に基づいて upsert を行います。
   * 生の `token` が提供された場合は暗号化して保存します。
   */
  async upsert(
    where: { id?: string; userId?: string; provider?: string },
    data: { userId: string; token: string; provider: string },
  ) {
    if (!data || !data.userId || !data.token || !data.provider) {
      throw new BadRequestException(
        'userId, token and provider are required for upsert',
      );
    }

    const encryptedToken = this.encryptionService.encrypt(data.token);

    const createDto: ExternalProviderAccessTokenCreateDto = {
      userId: data.userId,
      encryptedToken,
      provider: data.provider,
    };

    const updateDto: ExternalProviderAccessTokenUpdateDto = {
      encryptedToken,
      provider: data.provider,
    };

    return upsertExternalProviderAccessToken(where, createDto, updateDto);
  }

  async delete(id: string) {
    if (!id) throw new BadRequestException('id is required');
    return deleteExternalProviderAccessToken(id);
  }
}
