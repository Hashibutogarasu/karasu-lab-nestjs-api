import { Injectable } from '@nestjs/common';
import { findUserById } from '../lib';

@Injectable()
export class UsersService {
  async exists(userId: string) {
    return (await findUserById(userId)) !== undefined;
  }
}
