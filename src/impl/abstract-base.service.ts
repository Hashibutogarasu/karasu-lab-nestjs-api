import { Logger, OnModuleInit } from '@nestjs/common';
import { IBaseService } from '../interfaces/base.service.interface';

export abstract class AbstractBaseService
  implements IBaseService, OnModuleInit {
  private _logger: Logger;

  constructor() {
    const name =
      (this && this.constructor && this.constructor.name) ||
      AbstractBaseService.name;
    this._logger = new Logger(name);
  }

  get logger(): Logger {
    return this._logger;
  }

  onModuleInit() {
    this.logger.log(`${this.constructor.name} was initialized`);
  }
}
