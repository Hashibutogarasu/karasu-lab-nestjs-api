import { Logger } from '@nestjs/common';

export interface IBaseService {
  logger(): Logger;
}
