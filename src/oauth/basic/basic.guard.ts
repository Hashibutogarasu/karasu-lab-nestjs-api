import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { BasicAuthService } from './basic.service';
import { AppErrorCodes } from '../../types/error-codes';

@Injectable()
export class BasicOAuthGuard implements CanActivate {
  constructor(private readonly basicService: BasicAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const body = request.body;

    if (!body) {
      throw AppErrorCodes.INVALID_REQUEST;
    }

    const { clientId, clientSecret } = body;

    try {
      const client = await this.basicService.authenticate(
        request,
        clientId,
        clientSecret,
      );

      request.client = client;

      return true;
    } catch (err) {
      throw err;
    }
  }
}
