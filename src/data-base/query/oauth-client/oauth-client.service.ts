import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaClient, OAuthClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DataBaseService } from '../../data-base.service';
import { AppErrorCodes } from '../../../types/error-codes';
import { BaseService } from '../../../impl/base-service';
import { AppConfigService } from '../../../app-config/app-config.service';
import { UtilityService } from '../../utility/utility.service';
import { PublicUser } from '../../../auth/decorators/auth-user.decorator';
import { CreateOAuthClientResponseDto } from '../../../oauth/oauth.dto';

@Injectable()
export class OauthClientService extends BaseService {
  private prisma: PrismaClient;

  constructor(
    @Inject(forwardRef(() => DataBaseService))
    private readonly databaseService: DataBaseService,
    appConfig: AppConfigService,
    private readonly utilityService: UtilityService,
  ) {
    super(appConfig);
    this.prisma = this.databaseService.prisma();
  }

  async create(
    client: Omit<OAuthClient, 'id' | 'secret' | 'createdAt' | 'updatedAt'>,
    user: PublicUser,
  ): Promise<CreateOAuthClientResponseDto> {
    const { rawSecret, secret } = await this.generateSecret();

    if (!client.name) {
      throw AppErrorCodes.INVALID_CLIENT;
    }

    const clientResult = await this.prisma.oAuthClient.create({
      data: {
        ...client,
        secret,
        userId: user.id,
      },
    });

    return {
      clientId: clientResult.id,
      clientSecret: rawSecret,
    };
  }

  async update(
    updateData: Partial<
      Omit<
        OAuthClient,
        'user' | 'userId' | 'secret' | 'createdAt' | 'updatedAt'
      >
    >,
    user: PublicUser,
  ): Promise<void> {
    const { id, ...data } = updateData;

    if (!id) throw AppErrorCodes.INVALID_CLIENT;

    const client = await this.findByIdAndCheckForAccess(id, user);

    await this.prisma.oAuthClient.update({
      where: { id: client.id },
      data: data,
    });
  }

  private async updateClientSecret(clientId: string, hashedSecret: string, params?: { userId?: string }) {
    const client = await this.findById(clientId, params);

    await this.prisma.oAuthClient.update({
      where: {
        id: client.id
      },
      data: {
        secret: hashedSecret,
      }
    });
  }

  async delete(clientId: string, user: PublicUser): Promise<void> {
    const client = await this.findByIdAndCheckForAccess(clientId, user);

    await this.prisma.oAuthClient.delete({
      where: { id: client.id },
    });
  }

  async findById(clientId: string, params?: { userId?: string }): Promise<OAuthClient> {
    if (!clientId) throw AppErrorCodes.INVALID_CLIENT;
    try {
      const client = await this.prisma.oAuthClient.findUnique({
        where: { id: clientId },
      });

      if (params && params.userId && client?.userId !== params.userId) {
        throw AppErrorCodes.FORBIDDEN;
      }

      if (!client) {
        throw AppErrorCodes.CLIENT_NOT_FOUND;
      }

      return client;
    } catch (err) {
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }

  async regenerateClientSecret(clientId: string, user: PublicUser) {
    const { rawSecret, secret } = await this.generateSecret();

    await this.updateClientSecret(clientId, secret, { userId: user.id });

    return rawSecret;
  }

  async generateSecret() {
    const rawSecret = this.utilityService.generateRandomString(32);
    const secret = await bcrypt.hash(
      rawSecret,
      10,
    );

    return {
      rawSecret,
      secret,
    }
  }

  async authenticate(
    clientId: string,
    clientSecret: string,
  ): Promise<OAuthClient> {
    if (!clientId || !clientSecret) throw AppErrorCodes.INVALID_CLIENT;

    const client = await this.findById(clientId);
    const match = await bcrypt.compare(clientSecret, client.secret);
    if (!match) throw AppErrorCodes.INVALID_CLIENT;

    return client;
  }

  async findByIdAndCheckForAccess(
    clientId: string | undefined,
    user: PublicUser,
  ) {
    if (!clientId) {
      throw AppErrorCodes.INVALID_CLIENT;
    }

    const client = await this.findById(clientId);

    if (this.canAccess(client, user)) {
      return client;
    }
    throw AppErrorCodes.FORBIDDEN;
  }

  canAccess(client: OAuthClient, user: PublicUser) {
    if (client.userId === user.id) {
      return true;
    }

    throw AppErrorCodes.FORBIDDEN;
  }
}
