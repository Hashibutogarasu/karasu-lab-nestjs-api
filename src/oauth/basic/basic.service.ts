import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Request } from 'express';
import { AppErrorCodes } from '../../types/error-codes';
import { BaseService } from '../../impl/base-service';
import { AppConfigService } from '../../app-config/app-config.service';
import { OauthClientService } from '../../data-base/query/oauth-client/oauth-client.service';

@Injectable()
export class BasicAuthService extends BaseService {
  constructor(
    @Inject(forwardRef(() => OauthClientService))
    private readonly oauthClientService: OauthClientService,
    appConfig: AppConfigService,
  ) {
    super(appConfig);
  }

  private extractTokenFromHeader(
    request: Request,
  ): { clientId: string; clientSecret: string } | undefined {
    const auth = request.headers.authorization;
    if (!auth) return undefined;

    const [type, token] = auth.split(' ');
    if (type !== 'Basic' || !token) return undefined;

    let decoded: string;
    try {
      decoded = Buffer.from(token, 'base64').toString('utf-8');
    } catch (err) {
      throw AppErrorCodes.INVALID_REQUEST;
    }

    const idx = decoded.indexOf(':');
    if (idx === -1) throw AppErrorCodes.INVALID_REQUEST;

    const clientId = decoded.slice(0, idx);
    const clientSecret = decoded.slice(idx + 1);

    return { clientId, clientSecret };
  }

  async authenticate(
    request: Request,
    bodyClientId?: string,
    bodyClientSecret?: string,
  ) {
    const headerCreds = this.extractTokenFromHeader(request);
    const hasHeader = !!headerCreds;
    const hasBody = !!(bodyClientId || bodyClientSecret);

    if (hasHeader && hasBody) {
      throw AppErrorCodes.INVALID_REQUEST;
    }

    let clientId: string | undefined;
    let clientSecret: string | undefined;

    if (hasHeader) {
      clientId = headerCreds.clientId;
      clientSecret = headerCreds.clientSecret;
    } else if (hasBody) {
      if (!bodyClientId || !bodyClientSecret)
        throw AppErrorCodes.INVALID_CLIENT;
      clientId = bodyClientId;
      clientSecret = bodyClientSecret;
    } else {
      throw AppErrorCodes.INVALID_CLIENT;
    }

    // Delegate authentication to OauthClientService which handles DB + bcrypt
    const client = await this.oauthClientService.authenticate(
      clientId,
      clientSecret,
    );
    return client;
  }
}
