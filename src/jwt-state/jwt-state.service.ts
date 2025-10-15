import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateJwtStateDto, UpdateJwtStateDto } from './dto/jwt-state.dto';
import {
  createJWTState,
  deleteJWTState,
  getAllJWTState,
  getJWTStateById,
  updateJWTState,
} from '../lib';
import { generateJWTToken } from '../lib/auth/jwt-token';
import { User } from '@prisma/client';

@Injectable()
export class JwtStateService {
  async createJWT(createJwtStateDto: CreateJwtStateDto) {
    const tokenResult = await generateJWTToken({
      userId: createJwtStateDto.userId,
    });

    if (!tokenResult.success) {
      throw new HttpException(
        tokenResult.errorDescription || 'Failed to generate JWT token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      jwtId: tokenResult.jwtId,
      token: tokenResult.token,
      profile: tokenResult.profile,
      user: tokenResult.user,
      expiresAt: tokenResult.expiresAt,
    };
  }

  findAll(user: User) {
    return getAllJWTState({ userId: user.id });
  }

  findOne(id: string, user: User) {
    return getJWTStateById(id, { userId: user.id });
  }

  async update(
    id: string,
    updateJwtStateDto: UpdateJwtStateDto,
    user: User,
    isAdmin: boolean,
  ) {
    const state = await getJWTStateById(id);

    if (state?.userId == user.id || isAdmin) {
      return updateJWTState(id, updateJwtStateDto);
    }
  }

  async remove(id: string, user: User, isAdmin: boolean) {
    const state = await getJWTStateById(id);

    if (!state) {
      throw new HttpException('JWT state not found', HttpStatus.NOT_FOUND);
    }

    if (state?.userId == user.id || isAdmin) {
      return deleteJWTState(id);
    }

    throw new HttpException(
      'You can remove only your jwt state',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
