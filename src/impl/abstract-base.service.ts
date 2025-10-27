import { Logger, OnModuleInit } from '@nestjs/common';
import { IBaseService } from '../interfaces/base.service.interface';
import { AppConfigService } from '../app-config/app-config.service';

export abstract class AbstractBaseService
  implements IBaseService, OnModuleInit
{
  private _logger: Logger;

  constructor(private readonly configService: AppConfigService) {
    const name = this.constructor.name;
    this._logger = new Logger(name);
    this._logger.log(`${this.constructor.name} is initializing`);
  }

  get logger(): Logger {
    return this._logger;
  }

  get config(): AppConfigService {
    return this.configService;
  }

  onModuleInit() {
    this.logger.log(`${this.constructor.name} was initialized`);
  }
}
