import { Injectable } from '@nestjs/common';
import { DataBaseService } from '../../data-base.service';
import { PrismaClient } from '@prisma/client';
import {
  ExternalProviderAccessTokenCreateDto,
  ExternalProviderAccessTokenCreateSchema,
  ExternalProviderAccessTokenDecryptedRecord,
  ExternalProviderAccessTokenUpdateDto,
  ExternalProviderAccessTokenUpdateSchema,
} from '../../../types/external-provider-access-token';
import { AppErrorCodes } from '../../../types/error-codes';
import { EncryptionService } from '../../../encryption/encryption.service';

@Injectable()
export class ExternalProviderAccessTokenService {
  private prisma: PrismaClient;

  constructor(
    private readonly databaseService: DataBaseService,
    private readonly encryptionService: EncryptionService,
  ) {
    this.prisma = this.databaseService.prisma();
  }

  /**
   * 外部プロバイダーのアクセストークンを保存
   */
  async createExternalProviderAccessToken(data: unknown) {
    const parsed = ExternalProviderAccessTokenCreateSchema.parse(data);

    return this.prisma.externalProviderAccessToken.create({
      data: {
        userId: parsed.userId,
        encryptedToken: parsed.encryptedToken,
        provider: parsed.provider,
      },
    });
  }

  /**
   * IDで外部プロバイダーのアクセストークンを取得
   */
  async getExternalProviderAccessTokenById(id: string) {
    return this.prisma.externalProviderAccessToken.findUnique({
      where: { id },
    });
  }

  /**
   * ユーザーIDで外部プロバイダーのアクセストークンを取得
   */
  async getExternalProviderAccessTokensByUserId(userId: string) {
    return this.prisma.externalProviderAccessToken.findMany({
      where: { userId },
    });
  }

  /**
   * 外部プロバイダーのアクセストークンを更新
   */
  async updateExternalProviderAccessToken(id: string, data: unknown) {
    const parsed = ExternalProviderAccessTokenUpdateSchema.parse(data);

    return this.prisma.externalProviderAccessToken.update({
      where: { id },
      data: parsed,
    });
  }

  /**
   * 外部プロバイダーのアクセストークンをアップサート
   */
  async upsertExternalProviderAccessToken(
    where: { id?: string; userId?: string; provider?: string },
    createData: unknown,
    updateData: unknown,
  ) {
    const parsedCreate =
      ExternalProviderAccessTokenCreateSchema.parse(createData);
    const parsedUpdate =
      ExternalProviderAccessTokenUpdateSchema.parse(updateData);

    if (where.id) {
      return this.prisma.externalProviderAccessToken.upsert({
        where: { id: where.id },
        create: parsedCreate,
        update: parsedUpdate,
      });
    }

    const existing = await this.prisma.externalProviderAccessToken.findFirst({
      where: {
        userId: where.userId,
        provider: where.provider,
      },
    });

    if (existing) {
      return this.prisma.externalProviderAccessToken.update({
        where: { id: existing.id },
        data: parsedUpdate,
      });
    }

    return this.prisma.externalProviderAccessToken.create({
      data: parsedCreate,
    });
  }

  /**
   * 外部プロバイダーのアクセストークンを削除
   */
  async deleteExternalProviderAccessToken(id: string) {
    await this.prisma.externalProviderAccessToken.delete({ where: { id } });
    return true;
  }

  /**
   * 新しい外部プロバイダのアクセストークンを保存します。
   * 生のトークンを受け取り、保存前に暗号化します。
   */
  async save(data: { userId: string; token: string; provider: string }) {
    if (!data || !data.userId || !data.token || !data.provider) {
      throw AppErrorCodes.EXTERNAL_PROVIDER_TOKEN_MISSING_FIELDS;
    }

    const encryptedToken = this.encryptionService.encrypt(data.token);

    const createDto: ExternalProviderAccessTokenCreateDto = {
      userId: data.userId,
      encryptedToken,
      provider: data.provider,
    };

    return this.createExternalProviderAccessToken(createDto);
  }

  async getById(id: string) {
    if (!id) throw AppErrorCodes.EXTERNAL_PROVIDER_TOKEN_ID_REQUIRED;
    return this.getExternalProviderAccessTokenById(id);
  }

  async getByUserId(userId: string) {
    if (!userId) throw AppErrorCodes.EXTERNAL_PROVIDER_TOKEN_USERID_REQUIRED;
    return this.getExternalProviderAccessTokensByUserId(userId);
  }

  /**
   * idでレコードを取得し、復号済みの `token` プロパティを付与して返します。
   */
  async getDecryptedById(
    id: string,
  ): Promise<ExternalProviderAccessTokenDecryptedRecord | null> {
    if (!id) throw AppErrorCodes.EXTERNAL_PROVIDER_TOKEN_ID_REQUIRED;

    const record = await this.getExternalProviderAccessTokenById(id);
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
    if (!id) throw AppErrorCodes.EXTERNAL_PROVIDER_TOKEN_ID_REQUIRED;

    const updatePayload: Partial<ExternalProviderAccessTokenUpdateDto> = {};

    if (data.token) {
      updatePayload.encryptedToken = this.encryptionService.encrypt(data.token);
    } else if (data.encryptedToken) {
      updatePayload.encryptedToken = data.encryptedToken;
    }

    if (data.provider) {
      updatePayload.provider = data.provider;
    }

    return this.updateExternalProviderAccessToken(id, updatePayload);
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
      throw AppErrorCodes.EXTERNAL_PROVIDER_TOKEN_ID_USERID_REQUIRED;
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

    return this.upsertExternalProviderAccessToken(where, createDto, updateDto);
  }

  async delete(id: string) {
    if (!id) throw AppErrorCodes.EXTERNAL_PROVIDER_TOKEN_ID_REQUIRED;
    return this.deleteExternalProviderAccessToken(id);
  }
}
