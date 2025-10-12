import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateDeveloperDto } from './dto/create-developer.dto';
import { UpdateDeveloperDto } from './dto/update-developer.dto';
import {
  createClient,
  findAllClients,
  findClientById,
  updateClient,
  deleteClient,
  generateRandomString,
} from '../lib/database/query';
import { AppErrorCodes } from '../types/error-codes';

@Injectable()
export class DeveloperService {
  /**
   * OAuthクライアントを作成
   */
  async create(
    createDeveloperDto: CreateDeveloperDto,
    userId: string,
  ): Promise<{
    client_id: string;
    client_secret: string;
    client_name: string;
    redirect_uris: string[];
    grant_types: string[];
    scope?: string;
  }> {
    // 一意のclient_idを生成
    const client_id = 'dev_' + generateRandomString(16);
    const client_secret = generateRandomString(32);

    try {
      const client = await createClient({
        id: client_id,
        secret: client_secret,
        name: createDeveloperDto.client_name,
        redirectUris: [createDeveloperDto.redirect_uri],
        grantTypes: createDeveloperDto.grant_types || [
          'authorization_code',
          'refresh_token',
        ],
        scope: createDeveloperDto.scope || 'read write',
      });

      // client_secretは平文で一度だけ返す
      return {
        client_id: client.id,
        client_secret: client_secret, // 平文のまま返す（保存されているのはハッシュ化済み）
        client_name: client.name,
        redirect_uris: client.redirectUris,
        grant_types: client.grantTypes,
        scope: client.scope || undefined,
      };
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw AppErrorCodes.CLIENT_ID_ALREADY_EXISTS;
      }
      throw error;
    }
  }

  /**
   * 全てのOAuthクライアントを取得（開発者向け）
   */
  async findAll() {
    return await findAllClients();
  }

  /**
   * 特定のOAuthクライアントを取得
   */
  async findOne(clientId: string) {
    const client = await findClientById(clientId);
    if (!client) {
      throw AppErrorCodes.CLIENT_NOT_FOUND;
    }
    return client;
  }

  /**
   * OAuthクライアント情報を更新
   */
  async update(clientId: string, updateDeveloperDto: UpdateDeveloperDto) {
    const existingClient = await findClientById(clientId);
    if (!existingClient) {
      throw AppErrorCodes.CLIENT_NOT_FOUND;
    }

    const updateData: Parameters<typeof updateClient>[1] = {};

    if (updateDeveloperDto.redirect_uri) {
      updateData.redirectUris = [updateDeveloperDto.redirect_uri];
    }
    if (updateDeveloperDto.scope !== undefined) {
      updateData.scope = updateDeveloperDto.scope;
    }
    if (updateDeveloperDto.client_name) {
      updateData.name = updateDeveloperDto.client_name;
    }
    if (updateDeveloperDto.grant_types) {
      updateData.grantTypes = updateDeveloperDto.grant_types;
    }

    return await updateClient(clientId, updateData);
  }

  /**
   * OAuthクライアントを削除
   */
  async remove(clientId: string) {
    const existingClient = await findClientById(clientId);
    if (!existingClient) {
      throw AppErrorCodes.CLIENT_NOT_FOUND;
    }

    return await deleteClient(clientId);
  }
}
