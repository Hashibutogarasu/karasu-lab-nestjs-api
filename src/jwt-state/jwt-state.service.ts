import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateJwtStateDto, UpdateJwtStateDto } from './dto/jwt-state.dto';
import {
  createJWTState,
  deleteJWTState,
  getAllJWTState,
  getJWTStateById,
  updateJWTState,
} from '../lib';
import { User } from '@prisma/client';

@Injectable()
export class JwtStateService {
  create(createJwtStateDto: CreateJwtStateDto) {
    return createJWTState(createJwtStateDto.userId, { ...createJwtStateDto });
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

    if (state?.userId == user.id || isAdmin) {
      return deleteJWTState(id);
    }

    throw new HttpException(
      'You can remove only your jwt state',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
