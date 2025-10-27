import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { JwtTokenService } from '../../../auth/jwt-token/jwt-token.service';
import { DataBaseService } from '../../data-base.service';
import { PrismaClient, OAuthGrantedToken } from '@prisma/client';
import { BaseService } from '../../../impl/base-service';
import { AppConfigService } from '../../../app-config/app-config.service';
import { AppErrorCodes } from '../../../types/error-codes';
import cuid from 'cuid';

@Injectable()
export class OauthGrantedTokenService extends BaseService {
  private prisma: PrismaClient;

  constructor(
    private readonly jwtTokenService: JwtTokenService,
    @Inject(forwardRef(() => DataBaseService))
    private readonly databaseService: DataBaseService,
    appConfig: AppConfigService,
  ) {
    super(appConfig);
    this.prisma = this.databaseService.prisma();
  }

  async create(data: {
    userId: string;
    permissionBitMask: bigint | number;
    expiryAt: Date;
    clientId: string;
    jti?: string;
  }): Promise<OAuthGrantedToken> {
    const jti = data.jti ?? cuid();

    try {
      const created = await this.prisma.oAuthGrantedToken.create({
        data: {
          jti,
          userId: data.userId,
          permissionBitMask: BigInt(data.permissionBitMask),
          expiryAt: data.expiryAt,
          clientId: data.clientId,
        },
      });
      return created;
    } catch (err) {
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }

  payloadFromGrantedToken(granted: OAuthGrantedToken) {
    if (!granted) throw AppErrorCodes.JWT_STATE_NOT_FOUND;

    const iat = Math.floor(Date.now() / 1000);
    const exp = Math.floor(new Date(granted.expiryAt).getTime() / 1000);

    return {
      jti: granted.jti,
      sub: granted.userId,
      provider: granted.clientId,
      aud: granted.clientId,
      iat,
      exp,
    } as const;
  }

  async encodeGrantedJWT(granted: OAuthGrantedToken): Promise<string> {
    const payload = this.payloadFromGrantedToken(granted);
    return this.jwtTokenService.encodePayload(payload);
  }

  async findByJti(jti: string): Promise<OAuthGrantedToken | null> {
    if (!jti) return null;
    try {
      return await this.prisma.oAuthGrantedToken.findUnique({
        where: { jti },
      });
    } catch (err) {
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }

  async deleteByJti(jti: string): Promise<void> {
    if (!jti) throw AppErrorCodes.JWT_STATE_NOT_FOUND;

    try {
      const result = await this.prisma.oAuthGrantedToken.deleteMany({
        where: { jti },
      });

      if (result.count === 0) {
        throw AppErrorCodes.JWT_STATE_NOT_FOUND;
      }
    } catch (err) {
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }

  async deleteByUserAndClient(userId: string, clientId: string): Promise<void> {
    if (!userId || !clientId) throw AppErrorCodes.INVALID_REQUEST;
    try {
      const result = await this.prisma.oAuthGrantedToken.deleteMany({
        where: { userId, clientId },
      });
      if (result.count === 0) {
        throw AppErrorCodes.JWT_STATE_NOT_FOUND;
      }
    } catch (err) {
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }
}
