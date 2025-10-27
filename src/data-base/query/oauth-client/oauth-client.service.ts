import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaClient, OAuthClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DataBaseService } from '../../data-base.service';
import { AppErrorCodes } from '../../../types/error-codes';
import { BaseService } from '../../../impl/base-service';
import { AppConfigService } from '../../../app-config/app-config.service';

@Injectable()
export class OauthClientService extends BaseService {
  private prisma: PrismaClient;

  constructor(
    @Inject(forwardRef(() => DataBaseService))
    private readonly databaseService: DataBaseService,
    appConfig: AppConfigService,
  ) {
    super(appConfig);
    this.prisma = this.databaseService.prisma();
  }

  async authenticate(
    clientId: string,
    clientSecret: string,
  ): Promise<OAuthClient> {
    if (!clientId || !clientSecret) throw AppErrorCodes.INVALID_CLIENT;

    const client = await this.prisma.oAuthClient.findUnique({
      where: { id: clientId },
    });
    if (!client) throw AppErrorCodes.INVALID_CLIENT;

    const match = await bcrypt.compare(clientSecret, client.secret);
    if (!match) throw AppErrorCodes.INVALID_CLIENT;

    return client;
  }

  async findById(clientId: string): Promise<OAuthClient | null> {
    if (!clientId) return null;
    try {
      return await this.prisma.oAuthClient.findUnique({
        where: { id: clientId },
      });
    } catch (err) {
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }
}
