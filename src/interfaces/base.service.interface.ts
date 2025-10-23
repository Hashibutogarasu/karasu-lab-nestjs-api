import { Logger } from '@nestjs/common';

export interface IBaseService {
  get logger(): Logger;
}
