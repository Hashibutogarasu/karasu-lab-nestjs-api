import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { JWTState, PrismaClient, User } from '@prisma/client';
import { DataBaseService } from '../../data-base.service';
import { CreateJwtStateDto, UpdateJwtStateDto } from './jwt-state.dto';
import { JwtTokenService } from '../../../auth/jwt-token/jwt-token.service';
import { AppErrorCodes } from '../../../types/error-codes';

@Injectable()
export class JwtstateService {
  private prisma: PrismaClient;

  constructor(
    private readonly databaseService: DataBaseService,
    private readonly moduleRef: ModuleRef,
  ) {
    this.prisma = this.databaseService.prisma();
  }

  async createJWT(createJwtStateDto: CreateJwtStateDto) {
    const jwtTokenService = this.moduleRef.get(JwtTokenService, {
      strict: false,
    });

    const tokenResult = await jwtTokenService.generateJWTToken({
      userId: createJwtStateDto.userId,
      expirationHours: 1,
    });

    if (!tokenResult.success) {
      throw AppErrorCodes.JWT_CREATION_FAILED;
    }

    return {
      jti: tokenResult.jti,
      accessToken: tokenResult.accessToken,
      expiresAt: tokenResult.expiresAt,
      userId: tokenResult.userId,
    };
  }

  async createJWTState(
    userId: string,
    iat: number,
    exp: number,
    params?: { id?: string; revoked?: boolean },
  ) {
    const expiresAt = new Date(exp * 1000);
    return this.prisma.jWTState.create({
      data: {
        ...params,
        expiresAt,
        userId,
      },
    });
  }

  async cleanupExpiredJWTStates(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.jWTState.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });
    return result.count;
  }

  async getAllJWTState(params?: { userId: string }): Promise<JWTState[]> {
    return this.prisma.jWTState.findMany({
      where: {
        userId: params?.userId,
      },
    });
  }

  async getJWTStateById(
    id: string,
    params?: { userId: string },
  ): Promise<JWTState | null> {
    return this.prisma.jWTState.findFirst({
      where: {
        id,
        userId: params?.userId,
      },
    });
  }

  async updateJWTState(
    id: string,
    params: UpdateJwtStateDto,
  ): Promise<JWTState | null> {
    return this.prisma.jWTState.update({
      where: {
        id,
      },
      data: {
        ...params,
      },
    });
  }

  async deleteJWTState(id: string) {
    return this.prisma.jWTState.delete({
      where: { id },
    });
  }

  async revokeJWTState(id: string): Promise<boolean> {
    try {
      await this.prisma.jWTState.update({
        where: { id },
        data: { revoked: true },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async isJWTStateRevoked(id: string): Promise<boolean> {
    const jwtState = await this.prisma.jWTState.findUnique({
      where: { id },
    });
    return jwtState ? jwtState.revoked : true;
  }

  findAll(user: User) {
    return this.getAllJWTState({ userId: user.id });
  }

  findOne(id: string, user: User) {
    return this.getJWTStateById(id, { userId: user.id });
  }

  async update(
    id: string,
    updateJwtStateDto: UpdateJwtStateDto,
    user: User,
    isAdmin: boolean,
  ) {
    const state = await this.getJWTStateById(id);

    if (state?.userId == user.id || isAdmin) {
      return this.updateJWTState(id, updateJwtStateDto);
    }
  }

  async remove(id: string, user: User, isAdmin: boolean) {
    const state = await this.getJWTStateById(id);

    if (!state) {
      throw AppErrorCodes.JWT_STATE_NOT_FOUND;
    }

    if (state.userId === user.id || isAdmin) {
      return await this.deleteJWTState(id);
    }

    throw AppErrorCodes.FORBIDDEN;
  }
}
