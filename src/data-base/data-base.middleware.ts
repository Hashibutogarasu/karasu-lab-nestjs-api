import {
  Injectable,
  NestMiddleware,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { AppConfigService } from '../app-config/app-config.service';
import { DataBaseService } from './data-base.service';
import { AppErrorCodes } from '../types/error-codes';
import { BaseService } from '../impl/base-service';

@Injectable()
export class DataBaseMiddleware
  extends BaseService
  implements NestMiddleware, OnModuleInit
{
  constructor(
    private readonly dbService: DataBaseService,
    appConfig: AppConfigService,
  ) {
    super(appConfig);
  }

  async onModuleInit() {
    const databaseUrl = this.config.get('databaseUrl');

    if (!databaseUrl) {
      throw AppErrorCodes.INVALID_DATABASE_URL;
    }

    this.logger.log('Connecting to database...');

    try {
      await this.dbService.prisma().$connect();
    } catch (err) {
      throw AppErrorCodes.DATABASE_CONNECTION_ERROR;
    }

    this.logger.log('Database connected.');
  }

  use(req: any, res: any, next: () => void) {
    next();
  }
}
