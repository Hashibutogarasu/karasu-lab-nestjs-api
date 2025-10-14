import { Injectable, Logger, NestMiddleware } from '@nestjs/common';

import { Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);

  use(req: Request, _: Response, next: () => void): void {
    this.logger.log(this.createMessage(req));

    next();
  }

  private createMessage(req: Request): string {
    const { ip, method, url } = req;
    let msg = `[${ip}] [${method}] [${url}]`;
    if (req.body !== undefined) {
      msg += `\n${JSON.stringify(req.body)}`;
    }

    return msg;
  }
}
