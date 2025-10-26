import { Injectable } from '@nestjs/common';
import {
  OAuthAuthorizeQuery,
  OAuthTokenBodyDto,
  OAuthTokenResponseDto,
  OAuthTokenRevokeDto,
} from './oauth.dto';
import { AppErrorCodes } from '../types/error-codes';
import { PublicUser } from '../auth/decorators/auth-user.decorator';

@Injectable()
export class OauthService {
  async authorize(params: OAuthAuthorizeQuery) {
    throw AppErrorCodes.NOT_IMPLEMENTED;
  }

  async token(
    body: OAuthTokenBodyDto,
    user: PublicUser,
  ): Promise<OAuthTokenResponseDto> {
    throw AppErrorCodes.NOT_IMPLEMENTED;
  }

  async revoke(body: OAuthTokenRevokeDto, user: PublicUser): Promise<void> {
    throw AppErrorCodes.NOT_IMPLEMENTED;
  }
}
