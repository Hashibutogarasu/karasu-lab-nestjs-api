import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { JWTState, PrismaClient, User } from '@prisma/client';
import { DataBaseService } from '../../data-base.service';
import {
  CreateJwtStateDto,
  CreateJwtStateResponseDto,
  UpdateJwtStateDto,
} from '../../../jwt-state/jwt-state.dto';
import { JwtTokenService } from '../../../auth/jwt-token/jwt-token.service';
import { AppErrorCodes } from '../../../types/error-codes';
import { PublicUser } from '../../../auth/decorators/auth-user.decorator';
import cuid from 'cuid';

@Injectable()
export class JwtstateService {
  private prisma: PrismaClient;

  constructor(
    private readonly databaseService: DataBaseService,
    @Inject(forwardRef(() => JwtTokenService))
    private readonly jwtTokenService: JwtTokenService,
  ) {
    this.prisma = this.databaseService.prisma();
  }

  async createJWT(createJwtStateDto: CreateJwtStateDto): Promise<CreateJwtStateResponseDto> {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 1 * 60 * 60;

    const id = createJwtStateDto.id || cuid();

    const state = await this.createJWTState(
      createJwtStateDto.userId,
      iat,
      exp,
      {
        id,
        revoked: createJwtStateDto.revoked,
      },
    );

    const accessToken = await this.jwtTokenService.generateJWTToken({
      userId: createJwtStateDto.userId,
      jwtStateId: state.id,
      expirationHours: 1,
    });

    return {
      jti: state.id,
      accessToken: accessToken.accessToken,
      expiresAt: Math.floor(state.expiresAt!.getTime() / 1000),
      userId: state.userId,
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

  async findAll(user: PublicUser) {
    return {
      states: await this.getAllJWTState({ userId: user.id }),
    };
  }

  findOne(id: string, user: PublicUser) {
    return this.getJWTStateById(id, { userId: user.id });
  }

  async update(
    id: string,
    updateJwtStateDto: UpdateJwtStateDto,
    user: PublicUser,
    isAdmin: boolean = false,
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
