import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DataBaseService } from '../../data-base.service';
import {
  CreateSessionDto,
  SessionsFindAllRequestDto,
  UpdateSessionDto,
} from './session.dto';

@Injectable()
export class SessionService {
  private prisma: PrismaClient;

  constructor(private readonly databaseService: DataBaseService) {
    this.prisma = this.databaseService.prisma();
  }

  async findById(id: string) {
    return await this.prisma.session.findFirst({
      where: {
        id,
      },
    });
  }

  async findByJti(jti: string) {
    return await this.prisma.session.findFirst({
      where: {
        jti,
      },
    });
  }

  async findAll(data: SessionsFindAllRequestDto) {
    return await this.prisma.session.findMany({
      where: {
        userId: data.userId,
      },
    });
  }

  async create(data: CreateSessionDto) {
    const { user, id } = await this.prisma.session.create({
      data: {
        ...data,
      },
      select: {
        id: true,
        user: true,
      },
    });

    const { passwordHash, ...userData } = user;

    return {
      user: userData,
      id,
    };
  }

  async update(id: string, data: UpdateSessionDto) {
    return this.prisma.session.update({
      where: { id },
      data: {
        ...data,
      },
    });
  }

  async delete(id: string, userId: string) {
    return this.prisma.session.delete({
      where: { id, userId },
    });
  }
}
